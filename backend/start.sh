#!/bin/bash

# 小说写作助手启动脚本

PID=$(lsof -t -i:3001 2>/dev/null)

if [ -n "$PID" ]; then
    echo "服务已在运行，PID: $PID"
    echo "访问: http://localhost:3001"
    exit 0
fi

echo "正在启动小说写作助手..."
nohup node server.js > server.log 2>&1 &
sleep 2

NEW_PID=$(lsof -t -i:3001 2>/dev/null)
if [ -n "$NEW_PID" ]; then
    echo "✅ 启动成功，PID: $NEW_PID"
    echo "访问: http://localhost:3001"
else
    echo "❌ 启动失败，查看日志: tail -f server.log"
fi
