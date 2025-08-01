# Copyright (c) OpenMMLab. All rights reserved.
from .vit import ViT
from .resnet import ResNet, ResNetV1d
#from .hrnet import HRNet

__all__ = [
    'ViT', 'ResNet', 'ResNetV1d', #'HRNet'
]
