# schedulator
Simple schedule handling tool. Allows to create JSON schedule scheme and calculate next run based on it. Scheme has clear, readable and people-friendly format.
## Installation
`~$ npm install schedulator`
## Shut up and show me how to use it
```javascript
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
## Schedule methods
### nextOccurrence(scheduleObject)
Returns UTC date and time of nearest next occurrence of `scheduleObject` in ISO format (e.g. 2019-01-01T01:00:00.000Z). Method returns `null` in case if it is not possible to calculate next occurrence or `scheduleObject` has `endDateTime` in the past or event had one time schedule which already happened.
> Exception with error text will be thrown in case if `scheduleObject` contains incorrect schedule schema.
```javascript
let schedule = require('schedulator');
let scheduleTestObject = 
{
    "oneTime": "2019-01-01T01:00:00.000Z"
}
console.log(schedule.nextOccurrence(scheduleTestObject));
//2019-01-01T01:00:00.000Z
```
## Schedule object
Schedule object describes scheduling rule in JSON format and can be presented by one of next entity:
### oneTime
Event happens only once and is not going to be repeated.

 - `oneTime` - string, UTC date and time of event in ISO format.

```javascript
let scheduleTestObject = 
{ 
    "oneTime": "2019-01-01T01:00:00.000Z"
}
```
### daily
Event happens one per each `n` day according to [dailyFrequency](#dailyFrequency) field value.

- `startDateTime` - string, UTC date and time in ISO format since when schedule starts to be active.
- `endDateTime` - string, UTC date and time in ISO format till when schedule is active. `nextOccurrence` returns `null` if `endDateTime` is earlier when current date and time.
- `eachNDay` - integer, frequency of occurrence. 
- `dailyFrequency` - object, represents occurrence of event in scope of the day (qv [dailyFrequency](#dailyFrequency)).

### weekly
Event happens one per each `n` week according to [dailyFrequency](#dailyFrequency) field value.
### monthly
Event happens one per each `n` month according to [dailyFrequency](#dailyFrequency) field value.
### dailyFrequency
Daily, weekly and monthly schedule contains `dailyFrequency` value which presents occurrence of event in scope of the day.