#!/usr/bin/env python3
import os
import sys
from pathlib import Path

# 安装腾讯云 SDK
os.system('pip install -q cos-python-sdk-v5')

from cos.cos_client import CosConfig, CosS3Client

def upload_dir_to_cos(local_dir, bucket, region, secret_id, secret_key):
    """递归上传目录到腾讯云 COS"""
    config = CosConfig(
        Region=region,
        SecretId=secret_id,
        SecretKey=secret_key
    )
    client = CosS3Client(config)
    
    local_path = Path(local_dir)
    
    for file_path in local_path.rglob('*'):
        if file_path.is_file():
            # 计算相对路径作为 COS 中的 Key
            relative_path = file_path.relative_to(local_path)
            key = str(relative_path).replace('\\', '/')
            
            try:
                with open(file_path, 'rb') as f:
                    client.put_object(
                        Bucket=bucket,
                        Key=key,
                        Body=f
                    )
                print(f'✓ 上传成功: {key}')
            except Exception as e:
                print(f'✗ 上传失败: {key} - {e}')
                return False
    
    return True

if __name__ == '__main__':
    bucket = 'timemanage-1394588695'
    region = 'ap-guangzhou'
    secret_id = os.environ.get('TENCENT_SECRET_ID')
    secret_key = os.environ.get('TENCENT_SECRET_KEY')
    
    if not secret_id or not secret_key:
        print('错误: 缺少腾讯云凭证')
        sys.exit(1)
    
    if upload_dir_to_cos('./dist', bucket, region, secret_id, secret_key):
        print('\n✓ 所有文件上传成功！')
        sys.exit(0)
    else:
        print('\n✗ 上传过程中出现错误')
        sys.exit(1)
