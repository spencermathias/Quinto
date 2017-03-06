#!/usr/bin/env python
import RPi.GPIO as GPIO
import datetime
import MySQLdb
import time
from time import strftime

#variables for mysql
#db = MySQLdb.connect(host="localhost", user="root", passwd="xenoff78", db="webio")
#cur = db.cursor()

#print("Ultrasonic range finder")

GPIO.setmode(GPIO.BOARD)

Trig = 24
Echo = 26

GPIO.setup(Trig, GPIO.OUT)
GPIO.setup(Echo, GPIO.IN)
GPIO.output(Trig, 0)

time.sleep(.001)

while 1:
	GPIO.output(Trig, 1)
	time.sleep(.00001)
	GPIO.output(Trig, 0)
	while(GPIO.input(Echo) == 0):
		startTime = time.time()
	while(GPIO.input(Echo) == 1):
		timeElapsed = time.time() - startTime
		if timeElapsed > 1:
			break
	#print "Time elapsed: ", timeElapsed
	prox = 17150 * timeElapsed
	print prox
	#print "Distance measured: ", prox, "cm" #assuming sea level speed of sound
	#time.sleep(.1)
	#dateToWrite = (time.strftime("%Y-%m-%d ") + time.strftime("%H:%M:%S"))
	#remove = ("""truncate sensors;""")
	#sql = ("""INSERT INTO sensors (proximity, datetime) VALUES (%s, %s);""",(prox, dateToWrite))
	# try:
		# #execute the sql command
		# db.query(remove)
		# cur.execute(*sql)
		# #commit to database
		# db.commit()
		# print "write complete"
	# except:
		# #roll back in case of error
		# db.rollback()
		# print "write failed"
	#cur.close()
	#db.close()
	GPIO.cleanup()
	break 
