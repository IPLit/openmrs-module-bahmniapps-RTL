'use strict';

angular.module('bahmni.registration')
    .controller('CreatePatientController', ['$scope', '$rootScope', '$state', 'patientService', 'smsService', 'patient', 'spinner', 'appService', 'messagingService', 'ngDialog', '$q', '$translate', '$timeout',
        function ($scope, $rootScope, $state, patientService, smsService, patient, spinner, appService, messagingService, ngDialog, $q, $translate, $timeout) {
            var dateUtil = Bahmni.Common.Util.DateUtil;
            $scope.actions = {};
            var errorMessage;
            var configValueForEnterId = appService.getAppDescriptor().getConfigValue('showEnterID');
            $scope.addressHierarchyConfigs = appService.getAppDescriptor().getConfigValue("addressHierarchy");
            $scope.disablePhotoCapture = appService.getAppDescriptor().getConfigValue("disablePhotoCapture");
            $scope.showEnterID = configValueForEnterId === null ? true : configValueForEnterId;
            $scope.today = Bahmni.Common.Util.DateTimeFormatter.getDateWithoutTime(dateUtil.now());
            $scope.moduleName = appService.getAppDescriptor().getConfigValue('registrationModuleName');
            var patientId;
            var getPersonAttributeTypes = function () {
                return $rootScope.patientConfiguration.attributeTypes;
            };
            $scope.getTranslatedPatientIdentifier = function (patientIdentifier) {
                var translatedName = Bahmni.Common.Util.TranslationUtil.translateAttribute(patientIdentifier, Bahmni.Common.Constants.registration, $translate);
                return translatedName;
            };
            var prepopulateDefaultsInFields = function () {
                var personAttributeTypes = getPersonAttributeTypes();
                var patientInformation = appService.getAppDescriptor().getConfigValue("patientInformation");
                if (!patientInformation || !patientInformation.defaults) {
                    return;
                }
                var defaults = patientInformation.defaults;
                var defaultVariableNames = _.keys(defaults);

                var hasDefaultAnswer = function (personAttributeType) {
                    return _.includes(defaultVariableNames, personAttributeType.name);
                };

                var isConcept = function (personAttributeType) {
                    return personAttributeType.format === "org.openmrs.Concept";
                };

                var setDefaultAnswer = function (personAttributeType) {
                    $scope.patient[personAttributeType.name] = defaults[personAttributeType.name];
                };

                var setDefaultConcept = function (personAttributeType) {
                    var defaultAnswer = defaults[personAttributeType.name];
                    var isDefaultAnswer = function (answer) {
                        return answer.fullySpecifiedName === defaultAnswer;
                    };

                    _.chain(personAttributeType.answers).filter(isDefaultAnswer).each(function (answer) {
                        $scope.patient[personAttributeType.name] = {
                            conceptUuid: answer.conceptId,
                            value: answer.fullySpecifiedName
                        };
                    }).value();
                };

                var isDateType = function (personAttributeType) {
                    return personAttributeType.format === "org.openmrs.util.AttributableDate";
                };

                var isDefaultValueToday = function (personAttributeType) {
                    if (defaults[personAttributeType.name].toLowerCase() === "today") {
                        return true;
                    }
                    return false;
                };

                var setDefaultValue = function (personAttributeType) {
                    if (isDefaultValueToday(personAttributeType)) {
                        $scope.patient[personAttributeType.name] = new Date();
                    }
                    else {
                        $scope.patient[personAttributeType.name] = '';
                    }
                };

                var defaultsWithAnswers = _.chain(personAttributeTypes)
                    .filter(hasDefaultAnswer)
                    .each(setDefaultAnswer).value();

                _.chain(defaultsWithAnswers).filter(isConcept).each(setDefaultConcept).value();
                _.chain(defaultsWithAnswers).filter(isDateType).each(setDefaultValue).value();
            };

            var expandSectionsWithDefaultValue = function () {
                angular.forEach($rootScope.patientConfiguration && $rootScope.patientConfiguration.getPatientAttributesSections(), function (section) {
                    var notNullAttribute = _.find(section && section.attributes, function (attribute) {
                        return $scope.patient[attribute.name] !== undefined;
                    });
                    section.expand = section.expanded || (notNullAttribute ? true : false);
                });
            };

            var prepopulateFields = function () {
                var fieldsToPopulate = appService.getAppDescriptor().getConfigValue("prepopulateFields");
                if (fieldsToPopulate) {
                    _.each(fieldsToPopulate, function (field) {
                        var addressLevel = _.find($scope.addressLevels, function (level) {
                            return level.name === field;
                        });
                        if (addressLevel) {
                            $scope.patient.address[addressLevel.addressField] = $rootScope.loggedInLocation[addressLevel.addressField];
                        }
                    });
                }
            };
            prepopulateFields();

            var addNewRelationships = function () {
                var newRelationships = _.filter($scope.patient.newlyAddedRelationships, function (relationship) {
                    return relationship.relationshipType && relationship.relationshipType.uuid;
                });
                newRelationships = _.each(newRelationships, function (relationship) {
                    delete relationship.patientIdentifier;
                    delete relationship.content;
                    delete relationship.providerName;
                });
                $scope.patient.relationships = newRelationships;
            };

            var getConfirmationViaNgDialog = function (config) {
                var ngDialogLocalScope = config.scope.$new();
                ngDialogLocalScope.yes = function () {
                    ngDialog.close();
                    config.yesCallback();
                };
                ngDialogLocalScope.no = function () {
                    ngDialog.close();
                };
                ngDialog.open({
                    template: config.template,
                    data: config.data,
                    scope: ngDialogLocalScope
                });
            };

            var copyPatientProfileDataToScope = function (response) {
                var patientProfileData = response.data;
                $scope.patient.uuid = patientProfileData.patient.uuid;
                $scope.patient.name = patientProfileData.patient.person.names[0].display;
                $scope.patient.isNew = true;
                $scope.patient.registrationDate = dateUtil.now();
                $scope.patient.newlyAddedRelationships = [{}];
                $scope.actions.followUpAction(patientProfileData);
                patientId = patientProfileData.patient.identifiers[0].identifier;
            };

            var createPatient = function (jumpAccepted) {
                return patientService.create($scope.patient, jumpAccepted).then(function (response) {
                    copyPatientProfileDataToScope(response);
                }, function (response) {
                    if (response.status === 412) {
                        var data = _.map(response.data, function (data) {
                            return {
                                sizeOfTheJump: data.sizeOfJump,
                                identifierName: _.find($rootScope.patientConfiguration.identifierTypes, {uuid: data.identifierType}).name
                            };
                        });
                        getConfirmationViaNgDialog({
                            template: 'views/customIdentifierConfirmation.html',
                            data: data,
                            scope: $scope,
                            yesCallback: function () {
                                return createPatient(true);
                            }
                        });
                    }
                    if (response.isIdentifierDuplicate) {
                        errorMessage = response.message;
                    }
                });
            };

            var createPromise = function () {
                var deferred = $q.defer();
                createPatient().finally(function () {
                    return deferred.resolve({});
                });
                return deferred.promise;
            };

            $scope.create = function () {
                if ($scope.patient.extraIdentifiers && $scope.patient.extraIdentifiers[0]) {
                    patientService.search(undefined, $scope.patient.extraIdentifiers[0].identifier, undefined, undefined, undefined,
                        0, undefined, undefined, undefined, undefined, undefined, true).then(function (data) {
                            if (data.pageOfResults.length > 0) {
                                var errorMessage = $translate.instant("PATIENT_EXISTS", {natID: $scope.patient.extraIdentifiers[0].identifier});
                                messagingService.showMessage('error', errorMessage);
                                return $q.when({});
                            }
                        });
                }
                addNewRelationships();
                var errorMessages = Bahmni.Common.Util.ValidationUtil.validate($scope.patient, $scope.patientConfiguration.attributeTypes);
                if (errorMessages.length > 0) {
                    errorMessages.forEach(function (errorMessage) {
                        messagingService.showMessage('error', errorMessage);
                    });
                    return $q.when({});
                }
                return spinner.forPromise(createPromise()).then(function (response) {
                    if (errorMessage) {
                        messagingService.showMessage("error", errorMessage);
                        errorMessage = undefined;
                    } else {
                        if ($rootScope.registrationSMSToggle == "true" && ($scope.patient.phoneNumber != undefined)) {
                            var name = $scope.patient.givenName + " " + $scope.patient.familyName;
                            var message = patientService.getRegistrationMessage(patientId, name, $scope.patient.age.years, $scope.patient.gender);
                            smsService.sendSMS($scope.patient.phoneNumber, message);
                        }
                    }
                });
            };

            $scope.afterSave = function () {
                messagingService.showMessage("info", "REGISTRATION_LABEL_SAVED");
                $state.go("patient.edit", {
                    patientUuid: $scope.patient.uuid
                });
                closeSerialPort();
            };

            $scope.openNatVerifyPopup = async function () {
                const baudRate = 9600; // Replace with the baud rate used by your USB CDC scanner
                const storedPermission = localStorage.getItem('serialPermission');
                if (storedPermission === 'granted') {
                    const ports = await navigator.serial.getPorts();
                    if (ports.length === 0) {
                        await requestSerialPermission();
                    } else {
                        $scope.selectedPort = ports[0];
                    }
                } else {
                    await requestSerialPermission();
                }

                if ($scope.portOpen) {
                    verifyNat();
                } else {
                    if ($scope.selectedPort !== undefined) {
                        $scope.selectedPort.open({ baudRate }).then(function () {
                            $scope.portOpen = true;
                            verifyNat();
                        });
                    }
                }
            };

            async function requestSerialPermission () {
                try {
                    const port = await navigator.serial.requestPort();
                    if (port !== undefined) {
                        localStorage.setItem('serialPermission', 'granted');
                        $scope.selectedPort = port;
                        $rootScope.selectedPort = port;
                    }
                } catch (error) {
                    console.log('Error requesting serial permission:', error);
                }
            }

            var verifyNat = async function () {
                const textDecoder = new TextDecoder('ascii'); // Use UTF-8 encoding for Arabic characters
                var accumulatedData = '';
                const reader = $scope.selectedPort.readable.getReader();
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) {
                        break;
                    }
                    const decodedData = textDecoder.decode(value);
                    accumulatedData += decodedData; // Append the decoded data to the accumulated data
                    $timeout(function () {
                        performVerifyNatText(accumulatedData);
                        if ($scope.natData.natId) {
                            patientService.search(undefined, $scope.natData.natId, undefined, undefined, undefined,
                               0, undefined, undefined, undefined, undefined,
                               undefined, true).then(function (data) {
                                   if (data.pageOfResults.length > 0) {
                                       var errorMessage = $translate.instant("PATIENT_EXISTS", {natID: $scope.patient.extraIdentifiers[0].identifier});
                                       messagingService.showMessage('error', errorMessage);
                                   } else {
                                       performAddPatientDetails();
                                   }
                                   accumulatedData = '';
                                   reader.releaseLock();
                               });
                        } else {
                            $scope.scannedTextError = true;
                        }
                    }, 1000);
                }
            };

            var performAddPatientDetails = function () {
                var DateUtil = Bahmni.Common.Util.DateUtil;
                $scope.patient.givenName = $scope.natData.firstName;
                $scope.patient.familyName = $scope.natData.lastName;
                $scope.patient.middleName = $scope.natData.middleName;
                $scope.patient.primaryRelative = $scope.natData.motherName;
                $scope.patient.birthdate = moment($scope.natData.birth, "DD-MM-YYYY").toDate();
                var age = DateUtil.diffInYearsMonthsDays($scope.patient.birthdate, DateUtil.now());
                $scope.patient.age.years = age.years;
                $scope.patient.age.months = age.months;
                $scope.patient.age.days = age.days;
                $scope.patient.extraIdentifiers[0].identifier = $scope.natData.natId;
                $scope.patient.extraIdentifiers[0].registrationNumber = $scope.natData.natId;
                $scope.patient.extraIdentifiers[0].hasOldIdentifier = true;
            };

            var performVerifyNatText = function (accumulatedData) {
                $scope.natData = {};
                if (!accumulatedData || accumulatedData.length === 0) {
                    $scope.scannedTextError = true;
                    return;
                }
                const decoder = new TextDecoder("windows-1256");
                accumulatedData = str2ab(accumulatedData);
                accumulatedData = accumulatedData && decoder.decode(accumulatedData);
                var splitted = accumulatedData && accumulatedData.split('#');
                if (splitted && splitted.length > 0) {
                    if (splitted.length === 1) {
                        $scope.natData.natId = splitted[0].trim();
                    } else {
                        $scope.natData.firstName = splitted.length > 0 && splitted[0].trim();
                        $scope.natData.lastName = splitted.length > 1 && splitted[1].trim();
                        $scope.natData.middleName = splitted.length > 2 && splitted[2].trim();
                        $scope.natData.motherName = splitted.length > 3 && splitted[3].trim();
                        $scope.natData.birth = splitted.length > 4 && splitted[4].trim();
                        $scope.natData.natId = splitted.length > 5 && splitted[5].trim();
                    }
                }
            };

            function closeSerialPort () {
                if ($scope.selectedPort && $scope.selectedPort.readable) {
                    $scope.selectedPort.close().then(() => {
                        console.log("Serial port closed.");
                    }).catch((error) => {
                        console.error("Error closing serial port:", error);
                    });
                }
            }

            var str2ab = function (str) {
                var bufView = new Uint8Array(str.length);
                for (var i = str.length; i >= 0; i--) {
                    bufView[i] = str.charCodeAt(i);
                }
                return bufView;
            };

            var init = function () {
                $scope.patient = patient.create();
                prepopulateDefaultsInFields();
                expandSectionsWithDefaultValue();
                $scope.patientLoaded = true;
            };

            init();
        }
    ]);
