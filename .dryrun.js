let schedule = require('./lib/schedule');

let scheduleTestObject = 
{ 
	"enabled": false,
	"startDateTime": "2018-12-31T01:00:00.000Z",
    "month": ["dec", "jul"],
    "day": [29, 30, 31],
    "dailyFrequency": { 
		"start": "09:00:00", 
		"occursEvery": {
			"intervalValue": 90, 
			"intervalType": "minute"
		}
	}
}
console.log(schedule.nextOccurrence(scheduleTestObject));