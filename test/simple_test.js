const schedulator = require('../lib/schedule');

let scheduleTestObject = 
{
 "oneTime": "2019-01-01T01:00:00.000Z"
}
console.log(schedulator.summary(scheduleTestObject));
//{"result": 2019-01-01T01:00:00.000Z, "error": null}

let scheduleOutdatedTestObject = 
{ 
	"startDateTime": "2018-12-31T01:00:00.000Z",
	"endDateTime": "2001-12-31T01:00:00.000Z",
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
console.log(schedulator.summary(scheduleOutdatedTestObject));