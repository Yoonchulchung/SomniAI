import kagglehub
import os
import shutil

import argparse

parser = argparse.ArgumentParser(description="Download the IEEE VIP Cup 2021 dataset.")
parser.add_argument('--path', type=str, default='./', help='Path to save the dataset')
args = parser.parse_args()


def download_dataset(path):
    dataset_path = os.path.join(path, "ieee-vip-cup-2021")

    if os.path.exists(dataset_path):
        return f"Dataset already exists at {dataset_path}, skipping download."

    tmp_dataset_dir = kagglehub.dataset_download(handle="awsaf49/ieee-vip-cup-2021-train-val-dataset")

    if os.path.exists(tmp_dataset_dir):
        shutil.move(tmp_dataset_dir, dataset_path)        
        return f"Dataset downloaded to {dataset_path}"
    else:
        return "Failed to download dataset. Please check the handle or your internet connection."
        

if __name__ == "__main__":
    print(download_dataset(args.path))   