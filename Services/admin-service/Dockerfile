# ใช้ Node.js image เวอร์ชันล่าสุด LTS
FROM node:18

# ตั้ง working directory
WORKDIR /usr/src/app

# คัดลอก package.json และ package-lock.json
COPY package*.json ./

# ติดตั้ง dependencies
RUN npm install

# คัดลอก source code ทั้งหมด
COPY . .

# ระบุ port ที่ container จะ expose
EXPOSE 3003

# คำสั่งรันแอปพลิเคชัน
CMD ["npm", "start"]