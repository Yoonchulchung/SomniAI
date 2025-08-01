# =======================================================================================
#           Load IEEE VIP Cup 2021 Dataset
# =======================================================================================
import os
import json
def load_annotation(mode):

    if mode not in ['train', 'val']:
        raise ValueError("Mode must be 'train', 'val' ")
    
    if mode == 'train':
        if not os.path.exists('./converted-ieee-vip-cup-2021/vipcup2021_coco_train.json'):
            raise FileNotFoundError("Annotation file not found. Please ensure the path is correct.")
        
        with open('./converted-ieee-vip-cup-2021/vipcup2021_coco_train.json', 'r') as f:
            annotation = json.load(f)
            
        if 'images' not in annotation or 'annotations' not in annotation or 'categories' not in annotation:
            raise ValueError("Annotation file is missing required keys: 'images', 'annotations', or 'categories'.")
        
    elif mode == 'val':
        if not os.path.exists('./converted-ieee-vip-cup-2021/vipcup2021_coco_val.json'):
            raise FileNotFoundError("Annotation file not found. Please ensure the path is correct.")
        
        with open('./converted-ieee-vip-cup-2021/vipcup2021_coco_val.json', 'r') as f:
            annotation = json.load(f)
            
        if 'images' not in annotation or 'annotations' not in annotation or 'categories' not in annotation:
            raise ValueError("Annotation file is missing required keys: 'images', 'annotations', or 'categories'.")
        
    return annotation


import cv2

def process_image(annotation, id):
    images = annotation['images']
    iamge_anno = annotation['annotations']
    
    for target in images:

        if target['id'] == id:
            target_image_path = target['file_name']
            if not os.path.exists(target_image_path):
                raise FileNotFoundError(f"Image file {target_image_path} does not exist.")
            else:
                break

    for target in iamge_anno:
        if target['image_id'] == id:
            target_anno = target
            break
        
        
    image = cv2.imread(target_image_path)
    if image is None:
        raise ValueError(f"Failed to read image from {target_image_path}. Please check the file format and path.")

    target_bbox = target_anno['bbox']
    target_keypoints = target_anno['keypoints']
    target_area = target_anno['area']
    target_num_keypoints = target_anno['num_keypoints']
    
    print(f" \
          bbox: {target_bbox},\n \
          keypoints: {target_keypoints},\n \
          area: {target_area},\n \
          num_keypoints: {target_num_keypoints}")
    
    # Draw bounding box and keypoints on the image
    x, y, w, h = map(int, target_bbox)
    cv2.rectangle(image, (x, y), (x + w, y + h), (0, 255, 0), 2)
    for i in range(0, len(target_keypoints), 3):
        x = int(target_keypoints[i])
        y = int(target_keypoints[i + 1])
        if target_keypoints[i + 2] > 0:  # Only draw if visibility is greater than 0
            cv2.circle(image, (x, y), 5, (255, 0, 0), -1)

    cv2.imshow('Image with Bounding Box and Keypoints', image)
    cv2.waitKey(0)

    
        
def main():
    train_annotation = load_annotation('train')
    val_annotation = load_annotation('val')
    
    process_image(train_annotation, 150) 
    
if __name__ == "__main__":
    main()
    