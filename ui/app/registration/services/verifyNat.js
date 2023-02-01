'use strict';

angular.module('bahmni.registration')
    .service('natVerifyPopup', ['spinner', 'ngDialog', 'patientService', function (spinner, ngDialog, patientService) {
        var confirmBox = function (config) {
            var dialog;
            var DateUtil = Bahmni.Common.Util.DateUtil;
            var scope = config.scope;
            scope.natData = {};
            scope.natText = '';
            scope.patientExist = false;
            scope.noPatient = false;
            scope.scannedTextError = false;

            scope.close = function () {
                ngDialog.close(dialog.id);
            };

            scope.getNatText = function (data) {
                scope.natText = data.natTextTemp;
            };

            var str2ab = function (str) {
                var bufView = new Uint8Array(str.length);
                for (var i = str.length; i >= 0; i--) {
                    bufView[i] = str.charCodeAt(i);
                }
                return bufView;
            };

            scope.performVerifyNatText = function () {
                if (!scope.natText || scope.natText.length === 0) {
                    scope.scannedTextError = true;
                    return;
                }
                const decoder = new TextDecoder("windows-1256");
                scope.natText = str2ab(scope.natText);
                scope.natText = scope.natText && decoder.decode(scope.natText);
                var splitted = scope.natText && scope.natText.split('#');
                if (splitted && splitted.length > 0) {
                    if (splitted.length === 1) {
                        scope.natData.natId = splitted[0].trim();
                    } else {
                        scope.natData.firstName = splitted.length > 0 && splitted[0].trim();
                        scope.natData.lastName = splitted.length > 1 && splitted[1].trim();
                        scope.natData.middleName = splitted.length > 2 && splitted[2].trim();
                        scope.natData.motherName = splitted.length > 3 && splitted[3].trim();
                        scope.natData.birth = splitted.length > 4 && splitted[4].trim();
                        scope.natData.natId = splitted.length > 5 && splitted[5].trim();
                    }
                    if (scope.natData.natId) {
                        scope.scannedTextError = false;
                        var searchPromise = patientService.search(undefined, scope.natData.natId, undefined, undefined, undefined,
                               0, undefined, undefined, undefined, undefined,
                               undefined, true).then(function (data) {
                                   if (data.pageOfResults.length > 0) {
                                       scope.patientExist = true;
                                       scope.noPatient = false;
                                   } else {
                                       scope.noPatient = true;
                                       scope.patientExist = false;
                                   }
                               });
                        spinner.forPromise(searchPromise);
                    } else {
                        scope.scannedTextError = true;
                    }
                }
            };

            scope.performAddPatientDetails = function () {
                scope.patient.givenName = scope.natData.firstName;
                scope.patient.familyName = scope.natData.lastName;
                scope.patient.middleName = scope.natData.middleName;
                scope.patient.primaryRelative = scope.natData.motherName;
                scope.patient.birthdate = moment(scope.natData.birth, "DD-MM-YYYY").toDate();
                var age = DateUtil.diffInYearsMonthsDays(scope.patient.birthdate, DateUtil.now());
                scope.patient.age.years = age.years;
                scope.patient.age.months = age.months;
                scope.patient.age.days = age.days;
                scope.patient.extraIdentifiers[0].identifier = scope.natData.natId;
                scope.patient.extraIdentifiers[0].registrationNumber = scope.natData.natId;
                scope.patient.extraIdentifiers[0].hasOldIdentifier = true;
                scope.close();
            };

            dialog = ngDialog.open({
                template: '../registration/views/verifyNat.html',
                scope: scope,
                className: config.className || 'ngdialog-theme-default'
            });
        };
        return confirmBox;
    }]);
