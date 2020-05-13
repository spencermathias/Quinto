# RPi-RTDS

1. Install Node:

For raspberry pi:
	0. find out what arm version the cpu on your rasperry pi is with the command: cat /proc/cpuinfo

	1. download node from nodejs.org. Go to other downloads and select the arm version that matches the info from the above step.

	2. extract the downloaded file with: tar -xvf 

	3. enter the extracted directory with: cd 

	4. copy to usr/local with: sudo cp -R * /usr/local/

	5. check if it has installed with: node -v

	  it should return the version that you downloaded

	5. (optional) remove the downloaded and extracted files with: rm -r

For windows:

	1. download current (not LTS) node from nodejs.org. https://nodejs.org/en/download/

	2. install node with default options

	3. open a terminal in the RPi-RTDS project folder





2. setup project:

	1. install dependencies with: npm install

	2. set the public and local ip address in htmlRage->js->rageSocket.js
		var localAddress = "localhost:8080";
		var socket = io("192.168.1.xxx:8080"); // <- change this ip to the computers

	3. From the projct folder, run: node .\rageServer.js 

	4. Open a browser and go to localhost or the ip address of the computer.
