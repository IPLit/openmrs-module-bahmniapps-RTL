'use strict';

angular.module('bahmni.adt')
    .controller('WardLayoutController', ['$scope', '$rootScope', '$window', 'spinner', 'wardService', 'bedManagementService', 'bedService', 'messagingService', 'appService', '$document', '$element', '$translate',
        function ($scope, $rootScope, $window, spinner, wardService, bedManagementService, bedService, messagingService, appService, $document, $element, $translate) {
            $scope.selectedBed = null;
            var maxPatientsConfig = appService.getAppDescriptor().getConfig("maxPatientsPerBed");
            var maxPatientsPerBed = maxPatientsConfig ? maxPatientsConfig.value : 3;

            var init = function () {
                $element.find('.bed-info').hide();
                spinner.forPromise(getBeds());

                $document.bind('click', function () {
                    $scope.hideBedInfoPopUp();
                });
            };

            var getBeds = function () {
                return wardService.bedsForWard($scope.ward.ward.uuid).success(function (result) {
                    var groupedLayoutsByLocation = _.groupBy(result.bedLayouts, 'location');
                    $scope.ward.layouts = [];
                    _.map(groupedLayoutsByLocation, function (value, key) {
                        var layout = {
                            name: key,
                            beds: bedManagementService.createLayoutGrid(value)
                        };
                        $scope.ward.layouts.push(layout);
                    });
                });
            };

            $scope.assignBed = function (bed) {
                if (bed.patientInfo && bed.patientInfo.length >= maxPatientsPerBed) {
                    alert("A max of " + maxPatientsPerBed + " patients are allowed per bed. Please select other bed.");
                    return;
                }
                if (shouldTransfer(bed)) {
                    clearAssignmentError();
                    assignBedToPatient(bed, $scope.encounterUuid);
                }
            };

            var shouldTransfer = function (bed) {
                if (bed.patientInfo) {
                    var msg = $translate.instant("BED_OCCUPIED_MESSAGE_KEY");
                    return confirm(msg);
                }
                return true;
            };

            var clearAssignmentError = function () {
                $element.find('.bed-info').hide();
            };

            var assignBedToPatient = function (bed, encUuid) {
                spinner.forPromise(bedService.assignBed(bed.bed.bedId, $scope.patientUuid, encUuid).success(function () {
                    $rootScope.bed = bed.bed;
                    bedService.setBedDetailsForPatientOnRootScope($scope.patientUuid);
                    messagingService.showMessage('info', $translate.instant("Bed") + " " + bed.bed.bedNumber + " " + $translate.instant("is_assigned_successfully"));
                    $element.find('.bed-info').hide();
                }));
            };

            $scope.getCurrentBed = function () {
                return $rootScope.bedDetails;
            };

            $scope.fetchBedInfo = function (cell) {
                if (!cell.available && !cell.empty && !cell.patientInfo) {
                    spinner.forPromise(bedService.getBedInfo(cell.bed.bedId).success(function (data) {
                        cell.patientInfo = [];
                        _.each(data.patients, function (patient) {
                            cell.patientInfo.push({
                                "name": patient.person.personName.givenName + " " + (patient.person.personName.familyName === null ? "" : patient.person.personName.familyName),
                                "identifier": patient.identifiers[0].identifier,
                                "gender": patient.person.gender
                            });
                        });
                    }));
                }
            };

            $scope.hideBedInfoPopUp = function () {
                $scope.selectedBed = null;
                $scope.$apply();
            };

            $scope.setBedDetails = function (cell) {
                $element.find('.bed-info').hide();
                $scope.selectedBed = cell;
                $scope.$apply();
                if (!cell.empty) {
                    $element.find('.bed-info').show();
                }
            };

            $scope.highlightCurrentPatient = function (cell) {
                var currentBed = $scope.getCurrentBed();
                return !$scope.readOnly && (currentBed && currentBed.bedId === cell.bed.bedId);
            };

            init();
        }]);
