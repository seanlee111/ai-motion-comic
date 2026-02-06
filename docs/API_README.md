# API 接口文档

## 基础信息
- **Base URL**: `/api/v1`
- **Authentication**: 目前无需鉴权 (内部 API)，但依赖环境变量中的 `JIMENG_AK/SK` 和 `KLING_ACCESS_KEY/SECRET`。

## 接口列表

### 1. 提交生图任务
**POST** `/generate`

**Request Body:**
```json
{
  "provider": "JIMENG" | "KLING",
  "modelConfig": {
    "id": "jimeng-v4" | "kling-v2"
  },
  "prompt": "一段描述性的文字",
  "aspect_ratio": "16:9",
  "n": 1
}
```

**Response (Success):**
```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "taskId": "task_123456",
    "status": "SUBMITTED",
    "providerData": { ... }
  },
  "traceId": "uuid-trace-id"
}
```

**Response (Error):**
```json
{
  "code": 500,
  "message": "Jimeng Submit Failed",
  "detail": {
    "message": "InvalidAuthorization",
    "httpStatus": 400,
    "traceId": "uuid-trace-id"
  }
}
```

### 2. 查询任务状态
**POST** `/status`

**Request Body:**
```json
{
  "provider": "JIMENG" | "KLING",
  "taskId": "task_123456"
}
```

**Response:**
```json
{
  "code": 0,
  "message": "Success",
  "data": {
    "taskId": "task_123456",
    "status": "COMPLETED" | "IN_PROGRESS" | "FAILED",
    "images": ["https://url-to-image.png"],
    "error": "Error message if failed"
  }
}
```

## 错误码说明
- `0`: 成功
- `400`: 参数校验失败
- `500`: 服务器内部错误或上游 API 错误
