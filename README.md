# schedulator
Simple schedule handling tool. Allows to create JSON schedule scheme and calculate next run based on it. Scheme has clear, readable and people-friendly format.
## 1. Installation
`~$ npm install schedulator`
## 2. Shut up and show me how to use it
```
let schedule = require('schedulator');
let scheduleTestObject = 
{
    "startDateTime": "2019-01-01T01:00:00.000Z",
    "eachNWeek": 1,
    "dayOfWeek": ['mon', 'wed', 'fri'],
    "dailyFrequency": { "occursOnceAt": "11:30:00"}
}
console.log(schedule.nextOccurrence(scheduleTestObject));
//2019-04-12T11:30:00.000Z
```
## 3. Schedule methods
### nextOccurrence(scheduleObject)
Returns UTC date and time of nearest next occurrence of `scheduleObject` in ISO format (e.g. 2019-01-01T01:00:00.000Z). Method returns `null` in case if it is not possible to calculate next occurrence or `scheduleObject` has `endDateTime` in the past or event had one time schedule which already happened.
> Exception with error text will be thrown in case if `scheduleObject` contains incorrect schedule schema.
```
let schedule = require('schedulator');
let scheduleTestObject = 
{
    "oneTime": "2019-01-01T01:00:00.000Z"
}
console.log(schedule.nextOccurrence(scheduleTestObject));
//2019-01-01T01:00:00.000Z
```
## 4. Schedule object
Schedule object describes scheduling rule in JSON format and can be presented by one of next entity:
### 1. oneTime
Event happens only once and is not going to be repeated.

 - `oneTime` - UTC date and time of event in ISO format

```
let scheduleTestObject = 
{ 
    "oneTime": "2019-01-01T01:00:00.000Z"
}
```
### 2. daily
Event happens one per each `n` day accordingly to `dailyFrequency` field value.
### 3. weekly
Event happens one per each `n` week accordingly to `dailyFrequency` field value.
### 2. monthly
Event happens one per each `n` month accordingly to `dailyFrequency` field value.
### 999. dailyFrequency
Daily, weekly and monthly schedule contains `dailyFrequency` value which presents occurrence of event in scope of the day.