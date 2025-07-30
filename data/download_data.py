import kagglehub

# Download latest version
path = kagglehub.dataset_download("awsaf49/ieee-vip-cup-2021-train-val-dataset")

print("Path to dataset files:", path)