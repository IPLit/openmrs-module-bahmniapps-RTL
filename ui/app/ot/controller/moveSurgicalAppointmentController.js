'use strict';

angular.module('bahmni.ot').controller('moveSurgicalAppointmentController', ['$rootScope', '$scope', '$state', '$q', 'ngDialog', 'surgicalAppointmentService', 'surgicalAppointmentHelper', 'surgicalBlockHelper', 'messagingService', '$translate',
    function ($rootScope, $scope, $state, $q, ngDialog, surgicalAppointmentService, surgicalAppointmentHelper, surgicalBlockHelper, messagingService, $translate) {
        var init = function () {
            $scope.surgicalAppointment = $scope.ngDialogData.surgicalAppointment;
            $scope.sourceSurgicalBlock = $scope.ngDialogData.surgicalBlock;
            $scope.appointmentDuration = surgicalAppointmentHelper.getEstimatedDurationForAppointment($scope.surgicalAppointment);
        };

        var surgicalBlockMapper = new Bahmni.OT.SurgicalBlockMapper();
        $scope.changeInSurgeryDate = function () {
            if (!$scope.dateForMovingSurgery) {
                $scope.availableSurgicalBlocksForGivenDate = [];
                return;
            }
            var startDateTime = $scope.dateForMovingSurgery;
            var endDateTime = moment($scope.dateForMovingSurgery).endOf("day").toDate();
            surgicalAppointmentService.getSurgicalBlocksInDateRange(startDateTime, endDateTime, false).then(function (response) {
                var surgicalBlocksOfThatDate = _.map(response.data.results, function (surgicalBlock) {
                    return surgicalBlockMapper.map(surgicalBlock, $rootScope.attributeTypes, $rootScope.surgeons);
                });
                $scope.availableBlocks = _.filter(surgicalBlocksOfThatDate, function (surgicalBlock) {
                    return surgicalBlockHelper.getAvailableBlockDuration(surgicalBlock) >= $scope.appointmentDuration && surgicalBlock.uuid !== $scope.ngDialogData.surgicalBlock.uuid;
                });
                $scope.availableSurgicalBlocksForGivenDate = _.map($scope.availableBlocks, function (surgicalBlock) {
                    var blockStartTime = Bahmni.Common.Util.DateUtil.formatTime(surgicalBlock.startDatetime);
                    var blockEndTime = Bahmni.Common.Util.DateUtil.formatTime(surgicalBlock.endDatetime);
                    var providerName = surgicalBlock.provider.person.display;
                    var operationTheatre = surgicalBlock.location.name;
                    var validAppointments = _.filter(surgicalBlock.surgicalAppointments, function (appointment) {
                        return appointment.status !== 'POSTPONED' && appointment.status !== 'CANCELLED';
                    });

                    var destinationBlockDetails = {
                        displayName: providerName + ", " + operationTheatre + " (" + blockStartTime + " - " + blockEndTime + ")",
                        uuid: surgicalBlock.uuid,
                        surgicalAppointment: {sortWeight: validAppointments.length}
                    };
                    return destinationBlockDetails;
                });
            });
        };

        $scope.cancel = function () {
            ngDialog.close();
        };

        var updateSortWeightOfSurgicalAppointments = function () {
            var surgicalBlock = _.cloneDeep($scope.sourceSurgicalBlock);
            var surgicalAppointments = _.filter(surgicalBlock.surgicalAppointments, function (appointment) {
                return appointment.uuid !== $scope.ngDialogData.surgicalAppointment.uuid && appointment.status !== 'POSTPONED' && appointment.status !== 'CANCELLED';
            });
            surgicalBlock.surgicalAppointments = _.map(surgicalAppointments, function (appointment, index) {
                appointment.sortWeight = index;
                return appointment;
            });
            surgicalBlock.provider = {uuid: surgicalBlock.provider.uuid};
            surgicalBlock.location = {uuid: surgicalBlock.location.uuid};
            surgicalBlock.surgicalAppointments = _.map(surgicalBlock.surgicalAppointments, function (appointment) {
                appointment.patient = {uuid: appointment.patient.uuid};
                appointment.surgicalAppointmentAttributes = _.values(appointment.surgicalAppointmentAttributes).filter(function (attribute) {
                    return !_.isUndefined(attribute.value);
                });
                return _.omit(appointment, ['derivedAttributes', 'surgicalBlock', 'bedNumber', 'bedLocation']);
            });

            return surgicalAppointmentService.updateSurgicalBlock(surgicalBlock);
        };

        $scope.moveSurgicalAppointment = function () {
            var surgicalAppointment = {
                uuid: $scope.surgicalAppointment.uuid,
                patient: {uuid: $scope.surgicalAppointment.patient.uuid},
                sortWeight: $scope.destinationBlock.surgicalAppointment.sortWeight,
                surgicalBlock: {uuid: $scope.destinationBlock.uuid}
            };
            surgicalAppointmentService.updateSurgicalAppointment(surgicalAppointment).then(function () {
                updateSortWeightOfSurgicalAppointments().then(function () {
                    messagingService.showMessage('info', $translate.instant("Surgical_Appointment_moved_to_the_block") + $scope.destinationBlock.displayName + $translate.instant("Successfully"));
                    ngDialog.close();
                    $state.go("otScheduling", {viewDate: $scope.dateForMovingSurgery}, {reload: true});
                });
            });
        };

        init();
    }]);
