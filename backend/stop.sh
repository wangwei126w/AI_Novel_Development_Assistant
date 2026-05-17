#!/bin/bash

# 小说写作助手停止脚本

PID=$(lsof -t -i:3001 2>/dev/null)

if [ -n "$PID" ]; then
    kill $PID
    echo "✅ 已停止服务，PID: $PID"
else
    echo "服务未运行"
fi
