import copy
import os.path as osp
from copy import deepcopy
from itertools import chain, filterfalse, groupby
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple, Union

import numpy as np
from mmengine.dataset import BaseDataset, force_full_init
from mmengine.fileio import exists, get_local_path, load
from mmengine.logging import MessageHub
from mmengine.utils import is_list_of

from mmpose.registry import DATASETS
from mmpose.structures.bbox import bbox_xywh2xyxy
from .utils import parse_pose_metainfo

import json

@DATASETS.register_module()
class BaseIEEE2021Dataset(BaseDataset):
    """Base class for COCO-style datasets.

    Args:
        ann_file (str): Annotation file path. Default: ''.
        data_mode (str): Specifies the mode of data samples: ``'topdown'`` or
            ``'bottomup'``. In ``'topdown'`` mode, each data sample contains
            one instance; while in ``'bottomup'`` mode, each data sample
            contains all instances in a image. Default: ``'topdown'``
        metainfo (dict, optional): Meta information for dataset, such as class
            information. Default: ``None``.
        data_root (str, optional): The root directory for ``data_prefix`` and
            ``ann_file``. Default: ``None``.
        data_prefix (dict, optional): Prefix for training data.
            Default: ``dict(img='')``.
        filter_cfg (dict, optional): Config for filter data. Default: `None`.
        indices (int or Sequence[int], optional): Support using first few
            data in annotation file to facilitate training/testing on a smaller
            dataset. Default: ``None`` which means using all ``data_infos``.
        serialize_data (bool, optional): Whether to hold memory using
            serialized objects, when enabled, data loader workers can use
            shared RAM from master process instead of making a copy.
            Default: ``True``.
        pipeline (list, optional): Processing pipeline. Default: [].
        test_mode (bool, optional): ``test_mode=True`` means in test phase.
            Default: ``False``.
        lazy_init (bool, optional): Whether to load annotation during
            instantiation. In some cases, such as visualization, only the meta
            information of the dataset is needed, which is not necessary to
            load annotation file. ``Basedataset`` can skip load annotations to
            save time by set ``lazy_init=False``. Default: ``False``.
        max_refetch (int, optional): If ``Basedataset.prepare_data`` get a
            None img. The maximum extra number of cycles to get a valid
            image. Default: 1000.
        sample_interval (int, optional): The sample interval of the dataset.
            Default: 1.
    """

    METAINFO: dict = dict()

    def __init__(self,
                 ann_file: str = '',
                 data_mode: str = None,
                 metainfo: Optional[dict] = None,
                 data_root: Optional[str] = None,
                 data_prefix: dict = dict(img=''),
                 filter_cfg: Optional[dict] = None,
                 indices: Optional[Union[int, Sequence[int]]] = None,
                 serialize_data: bool = True,
                 pipeline: List[Union[dict, Callable]] = [],
                 test_mode: bool = False,
                 lazy_init: bool = False,
                 max_refetch: int = 1000,
                 sample_interval: int = 1):

        if data_mode != "topdown":
            raise ValueError('data_mode must be "topdown" for this dataset.')
        
        self.data_mode = data_mode

        self.sample_interval = sample_interval

        super().__init__(
            ann_file=ann_file,
            metainfo=metainfo,
            data_root=data_root,
            data_prefix=data_prefix,
            filter_cfg=filter_cfg,
            indices=indices,
            serialize_data=serialize_data,
            pipeline=pipeline,
            test_mode=test_mode,
            lazy_init=lazy_init,
            max_refetch=max_refetch)

        if self.test_mode:
            # save the ann_file into MessageHub for CocoMetric
            message = MessageHub.get_current_instance()
            dataset_name = self.metainfo['dataset_name']
            message.update_info_dict(
                {f'{dataset_name}_ann_file': self.ann_file})

    @classmethod
    def _load_metainfo(cls, metainfo: dict = None) -> dict:
        """Collect meta information from the dictionary of meta.

        Args:
            metainfo (dict): Raw data of pose meta information.

        Returns:
            dict: Parsed meta information.
        """

        if metainfo is None:
            metainfo = deepcopy(cls.METAINFO)

        if not isinstance(metainfo, dict):
            raise TypeError(
                f'metainfo should be a dict, but got {type(metainfo)}')

        # parse pose metainfo if it has been assigned
        if metainfo:
            metainfo = parse_pose_metainfo(metainfo)
        return metainfo

    @force_full_init
    def prepare_data(self, idx) -> Any:
        """
        Force full initialization of the dataset and prepare data 
        for the given index(image ID).
        """
        data_info = self.get_data_info(idx)

        # Mixed image transformations require multiple source images for
        # effective blending. Therefore, we assign the 'dataset' field in
        # `data_info` to provide these auxiliary images.
        # Note: The 'dataset' assignment should not occur within the
        # `get_data_info` function, as doing so may cause the mixed image
        # transformations to stall or hang.
        data_info['dataset'] = self

        return self.pipeline(data_info)

    def get_data_info(self, idx: int) -> dict:
        """
        Get meta information of the data sample at the given index(image ID).
        """
        data_info = super().get_data_info(idx)

        # Add metainfo items that are required in the pipeline and the model
        metainfo_keys = [
            'dataset_name', 'upper_body_ids', 'lower_body_ids', 'flip_pairs',
            'dataset_keypoint_weights', 'flip_indices', 'skeleton_links'
        ]

        for key in metainfo_keys:
            assert key not in data_info, (
                f'"{key}" is a reserved key for `metainfo`, but already '
                'exists in the `data_info`.')

            data_info[key] = deepcopy(self._metainfo[key])

        return data_info

    def load_data_list(self) -> List[dict]:
        """Load data list from COCO annotation file or person detection result
        file."""

        instance_list, image_list = self._load_annotations()
        data_list = self._get_topdown_data_infos(instance_list)

        return data_list

    def _load_annotations(self) -> Tuple[List[dict], List[dict]]:
        '''
        Load annotations from the given annotation file.
        '''
        
        assert exists(self.ann_file), (
            f'Annotation file `{self.ann_file}`does not exist')

        with get_local_path(self.ann_file) as local_path:
            with open(local_path, 'r') as f:
                self.anno_file = json.load(f)

        # ['images', 'annotations', 'categories'] is expected 
        # in the annotation file
        
        if 'categories' in self.anno_file:
            self._metainfo['CLASSES'] = self.anno_file['categories']
        else:
            raise ValueError(
                f'Annotation file {self.ann_file} does not contain  \
                "categories" key.')
        
        images = self.anno_file['images']
        annotations = self.anno_file['annotations']

        image_id_to_ann = {}
        for ann in annotations:
            image_id_to_ann.setdefault(ann['id'], []).append(ann)

        instance_list = []
        image_list = []

        for img in images:
            img_id = img['id']
            if img_id % self.sample_interval != 0:
                continue

            img.update({
                'img_id': img_id,
                'img_path': osp.join(self.data_prefix['img'], img['file_name']),
            })
            image_list.append(img)

            anns = image_id_to_ann.get(img_id, [])
            for ann in anns:
                instance_info = self.parse_data_info(
                    dict(raw_ann_info=ann, raw_img_info=img))

                if not instance_info:
                    continue

                instance_list.append(instance_info)

        return instance_list, image_list

    def parse_data_info(self, raw_data_info: dict) -> Optional[dict]:
        """Parse raw COCO annotation of an instance.

        Args:
            raw_data_info (dict): Raw data information loaded from
                ``ann_file``. It should have following contents:

                - ``'raw_ann_info'``: Raw annotation of an instance
                - ``'raw_img_info'``: Raw information of the image that
                    contains the instance

        Returns:
            dict | None: Parsed instance annotation
        """

        ann = raw_data_info['raw_ann_info']
        img = raw_data_info['raw_img_info']

        # filter invalid instance
        if 'bbox' not in ann or 'keypoints' not in ann:
            return None

        img_w, img_h = img['width'], img['height']

        # get bbox in shape [1, 4], formatted as xywh
        x, y, w, h = ann['bbox']
        x1 = np.clip(x, 0, img_w - 1)
        y1 = np.clip(y, 0, img_h - 1)
        x2 = np.clip(x + w, 0, img_w - 1)
        y2 = np.clip(y + h, 0, img_h - 1)

        bbox = np.array([x1, y1, x2, y2], dtype=np.float32).reshape(1, 4)

        # keypoints in shape [1, K, 2] and keypoints_visible in [1, K]
        _keypoints = np.array(
            ann['keypoints'], dtype=np.float32).reshape(1, -1, 3)
        keypoints = _keypoints[..., :2]
        keypoints_visible = np.minimum(1, _keypoints[..., 2])

        if 'num_keypoints' in ann:
            num_keypoints = ann['num_keypoints']
        else:
            num_keypoints = np.count_nonzero(keypoints.max(axis=2))

        if 'area' in ann:
            area = np.array(ann['area'], dtype=np.float32)
        else:
            area = np.clip((x2 - x1) * (y2 - y1) * 0.53, a_min=1.0, a_max=None)
            area = np.array(area, dtype=np.float32)

        data_info = {
            'img_id': ann['image_id'],
            'img_path': img['img_path'],
            'bbox': bbox,
            'bbox_score': np.ones(1, dtype=np.float32),
            'num_keypoints': num_keypoints,
            'keypoints': keypoints,
            'keypoints_visible': keypoints_visible,
            'area': area,
            'iscrowd': ann.get('iscrowd', 0),
            'segmentation': ann.get('segmentation', None),
            'id': ann['id'],
            'category_id': np.array(ann['category_id']),
            # store the raw annotation of the instance
            # it is useful for evaluation without providing ann_file
            'raw_ann_info': copy.deepcopy(ann),
        }

        if 'crowdIndex' in img:
            data_info['crowd_index'] = img['crowdIndex']

        return data_info

    @staticmethod
    def _is_valid_instance(data_info: Dict) -> bool:
        """Check a data info is an instance with valid bbox and keypoint
        annotations."""
        # crowd annotation
        if 'iscrowd' in data_info and data_info['iscrowd']:
            return False
        # invalid keypoints
        if 'num_keypoints' in data_info and data_info['num_keypoints'] == 0:
            return False
        # invalid bbox
        if 'bbox' in data_info:
            bbox = data_info['bbox'][0]
            w, h = bbox[2:4] - bbox[:2]
            if w <= 0 or h <= 0:
                return False
        # invalid keypoints
        if 'keypoints' in data_info:
            if np.max(data_info['keypoints']) <= 0:
                return False
        return True

    def _get_topdown_data_infos(self, instance_list: List[Dict]) -> List[Dict]:
        """Organize the data list in top-down mode."""
        # sanitize data samples
        data_list_tp = list(filter(self._is_valid_instance, instance_list))

        return data_list_tp

    def _get_bottomup_data_infos(self, instance_list: List[Dict],
                                 image_list: List[Dict]) -> List[Dict]:
        """Organize the data list in bottom-up mode."""

        # bottom-up data list
        data_list_bu = []

        used_img_ids = set()

        # group instances by img_id
        for img_id, data_infos in groupby(instance_list,
                                          lambda x: x['img_id']):
            used_img_ids.add(img_id)
            data_infos = list(data_infos)

            # image data
            img_path = data_infos[0]['img_path']
            data_info_bu = {
                'img_id': img_id,
                'img_path': img_path,
            }

            for key in data_infos[0].keys():
                if key not in data_info_bu:
                    seq = [d[key] for d in data_infos]
                    if isinstance(seq[0], np.ndarray):
                        if seq[0].ndim > 0:
                            seq = np.concatenate(seq, axis=0)
                        else:
                            seq = np.stack(seq, axis=0)
                    elif isinstance(seq[0], (tuple, list)):
                        seq = list(chain.from_iterable(seq))

                    data_info_bu[key] = seq

            # The segmentation annotation of invalid objects will be used
            # to generate valid region mask in the pipeline.
            invalid_segs = []
            for data_info_invalid in filterfalse(self._is_valid_instance,
                                                 data_infos):
                if 'segmentation' in data_info_invalid:
                    invalid_segs.append(data_info_invalid['segmentation'])
            data_info_bu['invalid_segs'] = invalid_segs

            data_list_bu.append(data_info_bu)

        # add images without instance for evaluation
        if self.test_mode:
            for img_info in image_list:
                if img_info['img_id'] not in used_img_ids:
                    data_info_bu = {
                        'img_id': img_info['img_id'],
                        'img_path': img_info['img_path'],
                        'id': list(),
                        'raw_ann_info': None,
                    }
                    data_list_bu.append(data_info_bu)

        return data_list_bu

    def filter_data(self) -> List[dict]:
        """Filter annotations according to filter_cfg. Defaults return full
        ``data_list``.

        If 'bbox_score_thr` in filter_cfg, the annotation with bbox_score below
        the threshold `bbox_score_thr` will be filtered out.
        """

        data_list = self.data_list

        if self.filter_cfg is None:
            return data_list

        # filter out annotations with a bbox_score below the threshold
        if 'bbox_score_thr' in self.filter_cfg:

            if self.data_mode != 'topdown':
                raise ValueError(
                    f'{self.__class__.__name__} is set to {self.data_mode} '
                    'mode, while "bbox_score_thr" is only supported in '
                    'topdown mode.')

            thr = self.filter_cfg['bbox_score_thr']
            data_list = list(
                filterfalse(lambda ann: ann['bbox_score'] < thr, data_list))

        return data_list