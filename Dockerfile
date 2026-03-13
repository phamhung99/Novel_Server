# Stage 1: Build
FROM public.ecr.aws/lambda/nodejs:22 AS builder
WORKDIR ${LAMBDA_TASK_ROOT}
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Runtime (chỉ copy cần thiết)
FROM public.ecr.aws/lambda/nodejs:22
WORKDIR ${LAMBDA_TASK_ROOT}
COPY --from=builder ${LAMBDA_TASK_ROOT}/dist ./dist
COPY --from=builder ${LAMBDA_TASK_ROOT}/node_modules ./node_modules
COPY --from=builder ${LAMBDA_TASK_ROOT}/package*.json ./
COPY --from=builder ${LAMBDA_TASK_ROOT}/service_account.json ./service_account.json
# Nếu có static files, config, etc. copy thêm
# COPY --from=builder ${LAMBDA_TASK_ROOT}/some-folder ./some-folder

CMD [ "dist/serverless.handler" ]