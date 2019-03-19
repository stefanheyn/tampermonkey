// ==UserScript==
// @name         Zeiterfassung Interflex Time to stay
// @namespace    http://tampermonkey.net/
// @version      0.2.3
// @updateURL    https://raw.githubusercontent.com/stefanheyn/tampermonkey/master/interflex.js
// @description  try to take over the world!
// @author       Stefan
// @match        http://192.168.6.102/WebClient/iflx/home.jsp
// @grant        none
// ==/UserScript==

window.setInterval(function() {
    'use strict';
    var $ = window.jQuery;
    const [overtimeHours, overtimeMinutesDec] = $('td.iflxHomeInfoAcc:first').text().trim().split(',');
    $('td.iflxHomeInfoAcc:first')
        .append(" (" + overtimeHours + ':' + ('0' + (overtimeMinutesDec * 0.6).toFixed(0)).slice(-2) + ")");

    const worktime = 8;
// Get the current Date
    var weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
    var date = new Date();
    date.setDate(date.getDate() - 0);
    var dd = String(date.getDate()).padStart(2, '0');
    var mm = String(date.getMonth() + 1).padStart(2, '0'); //January is 0!
    var yyyy = date.getFullYear();
    var day = weekdays[date.getDay() - 1];
    var dayString = day + ',' + dd + '.' + mm + '.';

// Find the relevant rows from the Timetable for the date
    var timeTableRows = $('.iflxHomeTable table tbody tr');
    var multiLine = false;
    var dateTableRows = [];
    timeTableRows.each(function() {
        var firstCol = $(this).find('td:first-child').html();
        if (typeof (firstCol) == 'undefined' || firstCol === null) {
            return;
        }
        firstCol = firstCol.trim();
        if (firstCol == dayString || multiLine) {
            multiLine = true;
            if (firstCol != dayString && firstCol != '&nbsp;') {
                multiLine = false;
                return;
            }
            dateTableRows.push(this);
        }
    });

// Get the start worktime
    var checkInTimes = $(dateTableRows[0]).find('td:nth-child(3)').html().trim().split(':');
    var checkInTime = ('0' + checkInTimes[0]).slice(-2) + ':' + ('0' + checkInTimes[1]).slice(-2);

// Find breakTime
    var breakTime = 0;
    dateTableRows.forEach(function(row) {
        var reason = $(row).find('td:last-child').html();
        if (typeof (reason) == 'undefined') {
            return;
        }
        reason = reason.trim();

        if ($.inArray(reason, ["Mittagspause", "9"]) !== -1) {
            var restStart = $(row).find('td:nth-child(3)').html().trim();
            var restEnd = $(row).find('td:nth-child(4)').html().trim();
            var rest = (new Date("1970-1-1 " + restEnd) - new Date("1970-1-1 " + restStart)) / 1000 / 60 / 60;
            breakTime = breakTime + rest;
        }
    });
    if (breakTime == 0) {
        breakTime = 0.5;
    }

// Get the end worktime or set it to now
    var checkOutTimes = $(dateTableRows).last().find('td:nth-child(4)').html().trim();
    if (checkOutTimes == '&nbsp;') {
        checkOutTimes = date.getHours() + ':' + date.getMinutes();
    }
    checkOutTimes = checkOutTimes.split(':');
    var checkOutTime = ('0' + checkOutTimes[0]).slice(-2) + ':' + ('0' + checkOutTimes[1]).slice(-2);

    var workStartDateTime = new Date(yyyy + '-' + mm + '-' + dd + ' ' + checkInTime);
    var workEndDateTime = new Date(yyyy + '-' + mm + '-' + dd + ' ' + checkOutTime);

    var currentStayTime = (workEndDateTime - workStartDateTime) / 1000 / 60 / 60;
    var currentWorkeTime = currentStayTime - breakTime;

    var timeToStay = worktime - currentWorkeTime;

// reformat dezimaltime to hours and minutes
    var hoursMinutes = timeToStay.toFixed(2).toString().split(/[.:]/);
    var hours = parseInt(hoursMinutes[0], 10);
    var minutes = hoursMinutes[1] ? parseInt(hoursMinutes[1] * 0.6, 10) : 0;

    var timeToStayReadable = hours + ':' + minutes;
    timeToStayReadable = ('0' + hours).slice(-2) + ':' + ('0' + minutes).slice(-2);

    $(dateTableRows).last().find('td:nth-child(5)').html('<div>' + timeToStayReadable + '</div>');
},  2 * 60 * 1000);
