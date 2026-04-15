#!/bin/bash
# 从 .env 文件读取并部署环境变量到 Cloudflare Pages

if [ ! -f .env ]; then
  echo "Error: .env file not found"
  exit 1
fi

echo "Deploying environment variables to Cloudflare Pages..."

# 读取 .env 文件并部署每个变量
while IFS='=' read -r key value; do
  # 跳过空行和注释
  [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
  
  # 清理空格
  key=$(echo "$key" | xargs)
  value=$(echo "$value" | xargs)
  
  # 只部署 GATEWAY_ 和 AUTH_ 开头的变量
  if [[ "$key" =~ ^(GATEWAY_|AUTH_) ]]; then
    echo "Setting $key..."
    npx wrangler pages secret put "$key" --project-name=sops <<< "$value"
  fi
done < .env

echo "Environment variables deployed successfully!"
