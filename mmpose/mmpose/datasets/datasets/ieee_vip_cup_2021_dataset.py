from mmpose.registry import DATASETS
from .base_ieee_vip_cup_2021_dataset import BaseIEEE2021Dataset

@DATASETS.register_module()
class IEEEVIPCup2021Dataset(BaseIEEE2021Dataset):
    METAINFO: dict = dict(from_file='configs/_base_/datasets/ieee_vip_cup_2021.py')