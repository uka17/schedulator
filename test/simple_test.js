const schedulator = require('../lib/schedule');

let scheduleTestObject = 
{
  startDateTime: '2018-01-31T20:54:23.071Z',
  eachNDay: 1,
  dailyFrequency: { start: '11:11:11', occursEvery: {intervalValue: 1, intervalType: 'minute'}}  
}
console.log(schedulator.summary(scheduleTestObject));