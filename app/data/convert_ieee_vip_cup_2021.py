# =======================================================================================
#           Convert IEEE VIP Cup 2021 Dataset
# =======================================================================================
'''
Training Data :
1 ~ 30 is nocover, annotated

Validation Data :
subj 71-75, cover1, annotated
subj 76-80, cover2, annotated
'''
import scipy.io
import numpy as np
import sys
import json
def convert_ieee_vip_cup_2021_dataset_to_coco_json():
    ''' 
    Data Path Example : ./ieee-vip-cup-2021/train/train/00001/align_PTr_RGB.npy
    
    We need to convert the joints_gt_RGB.mat files to a format suitable for training with MMPose.
    '''

    data_dir = "./ieee-vip-cup-2021/train/train/"
    
    print(f"Processing dataset in directory: {data_dir}")
    if not os.path.exists(data_dir):
        raise FileNotFoundError(f"The specified data directory does not exist: {data_dir}")

    idx_start = 1
    idx_counting = idx_start
    
    final_image_infos, final_annotation_infos = [], []
    
    bar_length = 50

    for progress_idx, folder in enumerate(os.listdir(data_dir)):
        folder_path = os.path.join(data_dir, folder)
        
        if not os.path.isdir(folder_path):
            raise NotADirectoryError(f"Expected a directory but found a file: {folder_path}")
        
        # We don't need to process the align_PTr_RGB.npy files for training
        if "joints_gt_RGB.mat" in os.listdir(folder_path):
            img_info, anno_info, idx_counting = convert_mat_single_folder(folder_path, idx_counting)
            
            final_image_infos.extend(img_info)
            final_annotation_infos.extend(anno_info)
        
        # print progress bar
        progress = (progress_idx + 1) / len(os.listdir(data_dir))
        filled_length = int(round(bar_length * progress))
        progress_str = ">" * filled_length + " " * (bar_length - filled_length)

        status = f"\r[{progress_str}] {progress * 100:.2f}%"

        sys.stdout.write(f"{status}")
        sys.stdout.flush()
    print("\nDataset processing completed. Exporting annotations...")
    
    categories = [{
        "id": 1,
        "name": "person",
        "keypoints": [
            "head", "neck", "r_shoulder", "r_elbow", "r_wrist",
            "l_shoulder", "l_elbow", "l_wrist",
            "r_hip", "r_knee", "r_ankle",
            "l_hip", "l_knee", "l_ankle"
        ],
        "skeleton": [
            [1, 2], [2, 3], [3, 4],
            [1, 5], [5, 6], [6, 7],
            [1, 8], [8, 9], [9, 10],
            [1, 11], [11, 12], [12, 13]
        ]
    }]
    
    converted_data_dir = "./converted-ieee-vip-cup-2021/"
    
    if not os.path.exists(converted_data_dir):
        os.makedirs(converted_data_dir)
    OUT_JSON = os.path.join(converted_data_dir, "vipcup2021_coco.json")
    coco = dict(images=final_image_infos, annotations=final_annotation_infos, categories=categories)
    with open(OUT_JSON, "w") as fp:
        json.dump(coco, fp)
        
    print(f"Annotations exported to {OUT_JSON}")
    
    
import cv2
def convert_mat_single_folder(file_path, idx_start):
    '''
    mat file : Ground Truth (GT) Pose   |   (3, 14, N) -> [x, y, if_occluded] x 14 joints x N frames
    
    npy file : Homography -> Not Necessary for training, Only for calibration with RGB and IR
    
    return converted annotations in COCO format
    '''
    
    joints_file = os.path.join(file_path, 'joints_gt_RGB.mat')
    
    joints = scipy.io.loadmat(joints_file)["joints_gt"] # (3, 14, N)
    joints = joints.transpose(2, 1, 0)  # (N, 14, 3)
    
    num_frames = joints.shape[0]
    
    image_infos, annotation_infos = [], []
    idx_counting = idx_start
    
    for idx in range(1, num_frames + 1):
        img_name = f"image_{idx:06d}.png"
        img_path = os.path.join(file_path, 'RGB', 'uncover', img_name)
        
        if not os.path.exists(img_path):
            raise FileNotFoundError(f"Image file does not exist: {img_path}")
        
        img = cv2.imread(img_path)

        bbox, kp_xyv, num_visible = process_joints(joints[idx - 1])
        image_info, annotation_info = write_annotations(img, img_name, bbox, kp_xyv, num_visible, idx_counting)
        
        image_infos.append(image_info)
        annotation_infos.append(annotation_info)
        
        idx_counting += 1

    idx_end = idx_counting

    return image_infos, annotation_infos, idx_end
    

def process_joints(joints):
    '''
    The lable matrix joints_gt_<modality>.mat has the format <x,y,if_occluded> x n_joints x n_subjects. 
    Original label is 1 based coordinate, please transfer to 0 based for server evaluation by x=x-1, y=y-1
    
    return (bbox, keypoints)
    '''
    
    # ========= 1-based -> 0-based conversion =========
    kp_xyv = np.zeros((14, 3), dtype=np.float32)
    for i in range(14):
        x = joints[i][0] - 1
        y = joints[i][1] - 1
        
        v = 2 if int(joints[i][2]) == 0 else 0 # # 2 for visible, 0 for occluded
                    
        kp_xyv[i] = [x, y, v]

    xs = kp_xyv[:, 0]
    ys = kp_xyv[:, 1]
    vs = kp_xyv[:, 2] > 0

    num_visible = int(vs.sum())

    if num_visible == 0 :
        raise ValueError("No visible keypoints found in the joints data.")
    
    # ========== Find BBox for MMPose Training ==========
    x1, y1 = xs.min(), ys.min()
    x2, y2 = xs.max(), ys.max()
    
    bbox = [float(x1), float(y1), float(x2 - x1), float(y2 - y1)]
    return bbox, kp_xyv, num_visible


def write_annotations(img, img_name, bbox, kp_xyv, num_visible, idx):
        h, w = img.shape[:2]

        keypoints_flat = []
        for kp in kp_xyv:
            x, y, v = kp
            keypoints_flat += [float(x), float(y), int(v)]

        image_infos = {
            "id": idx,
            "file_name": img_name,
            "width": w,
            "height": h
        }

        annotation_infos ={
            "id": idx,
            "image_id": idx,
            "category_id": 1,
            "keypoints": keypoints_flat,
            "num_keypoints": num_visible,
            "bbox": bbox,
            "area": float(bbox[2] * bbox[3]),
            "iscrowd": 0
        }
        return image_infos, annotation_infos

        
if __name__ == "__main__":
    convert_ieee_vip_cup_2021_dataset_to_coco_json()