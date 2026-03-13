FROM public.ecr.aws/lambda/nodejs:22

# Tạo thư mục làm việc
WORKDIR ${LAMBDA_TASK_ROOT}

# Copy package files trước → cache tốt hơn
COPY package*.json ./

# Cài dependencies (production thôi để nhẹ image)
RUN npm ci --omit=dev

# Copy source và build
COPY . .

# Build NestJS
RUN npm run build

# Handler (có thể override sau)
CMD [ "dist/serverless.handler" ]