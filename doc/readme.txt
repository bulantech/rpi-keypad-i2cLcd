install
=============
1. อัด 2021-05-07-raspios-buster-armhf-full.img
2. เปิด setting ตาม step 
3. ไปที่ raspi-config เปิด ssh, vnc
4. static ip et0 192.168.1.2
5. ให้เนตออก wlan0 แก้ไฟล์ /etc/dhcpcd.conf
interface wlan0
metric 200

6. Install node js 
sudo apt install -y nodejs

7. Update npm
sudo npm i npm -g