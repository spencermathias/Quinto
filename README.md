# RPi-RTDS
Raspberry pi realtime data server based on node.js express and socket.io.

To Use:
1. download node from nodejs.org. Select the arm v6 version for raspberry pi A, B, or B+. For now, the current file  is node-v7.7.1-linux-armv61

2. extract with: tar -xvf node-v7.7.1-linux-armv6l.tar.gz 

3. enter directory with: cd node-v7.7.1-linux-armv6l

4. copy to usr/local with: sudo cp -R * /usr/local/

5. check if it has installed with: node -v

  it should return: v7.7.1

5. remove old files with: rm -r node-v7.7.1-linux-armv6l && rm node-v7.7.1-linux-armv6l.tar.xz

6. npm install express --save
  The warnings at the end are normal

7. npm install socket.io --save
  The warnings at the end are normal

3. Run node server.js in a command line. 

   This starts a node.js webserver with socket.io to bidirectionally send data between a raspberry pi and a web browser.

4. Go to the ip address of the raspberry pi in a webbrowser. The index.html page should appear.
