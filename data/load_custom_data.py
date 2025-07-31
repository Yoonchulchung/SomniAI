import os
import torch
from PIL import Image
from torch.utils.data import Dataset
import torchvision.transforms as transforms

from timm.data import create_transform
from timm.data import IMAGENET_DEFAULT_MEAN, IMAGENET_DEFAULT_STD


# =======================================================================================
#           Custom Image Dataset Loader
# =======================================================================================
def build_transform(is_training, input_size=(3, 224, 224), interpolation='bilinear', mean=(0.485, 0.456, 0.406), std=(0.229, 0.224, 0.225), crop_pct=0.9):
    transform = create_transform(
        input_size=input_size,
        is_training=is_training,
        interpolation=interpolation,
        mean=mean,
        std=std,
        crop_pct=crop_pct,
    )
    return transform


class CustomImageDataset(Dataset):
    def __init__(self, image_dir, transform=None):
        self.image_dir = image_dir
        self.transform = build_transform(
                is_training=True,
                input_size=(3, 224, 224),
                interpolation='bilinear',
                mean=IMAGENET_DEFAULT_MEAN,
                std=IMAGENET_DEFAULT_STD,
                crop_pct=0.9,
            )
        self.image_files = [f for f in os.listdir(image_dir) if f.lower().endswith(('.jpeg', '.jpg', '.png'))]

    def __len__(self):
        return len(self.image_files)

    def __getitem__(self, idx):
        image_path = os.path.join(self.image_dir, self.image_files[idx])
        image = Image.open(image_path).convert('RGB')

        label = torch.tensor(1)
        label = label.unsqueeze(0)
        label = label.to('cuda')
        
        transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor()
        ])

        image = transform(image)
        image = image.unsqueeze(0)
        image = image.to('cuda')
        return image, label