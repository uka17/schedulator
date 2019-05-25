//schedule test data preparation
module.exports.oneTimeScheduleOK = {
    enabled: true,
    oneTime: '2018-01-31T20:54:23.071Z'
};
module.exports.dailyScheduleOnceOK = {
    startDateTime: '2018-01-31T20:54:23.071Z',
    eachNDay: 1,
    dailyFrequency: { occursOnceAt: '11:11:11'}
};
module.exports.dailyScheduleEveryOK = {
    enabled: true,
    startDateTime: '2018-01-31T20:54:23.071Z',
    eachNDay: 1,
    dailyFrequency: { start: '11:11:11', occursEvery: {intervalValue: 1, intervalType: 'minute'}}
};
module.exports.weeklyScheduleOK = {
    startDateTime: '2018-01-31T20:54:23.071Z',
    eachNWeek: 1,
    dayOfWeek: ['mon', 'wed', 'fri'],
    dailyFrequency: { occursOnceAt: '11:11:11'}
};
module.exports.monthlyScheduleOK = {
    enabled: true,
    startDateTime: '2018-01-31T20:54:23.071Z',
    month: ['jan', 'jul'],
    day: [11, 2, 8, 1],
    dailyFrequency: { start: '11:11:11', occursEvery: {intervalValue: 1, intervalType: 'minute'}}
};
//utils validation test data
module.exports.validTime = '11:11:11';
module.exports.invalidTimes = ['aa:11:11', '24:11:11', '11:60:11', '11:77:aa', '25:aa:64', 'aaaa']

module.exports.validDateTime = '2015-03-25T12:00:00Z';
module.exports.invalidDateTimes = ['2015-aa-25T12:00:00Z', '2015-13-25T12:00:00Z', '2015-03-32T12:00:00Z', '2015032512:00:00Z', 'aaa']