'use strict';

angular.module('bahmni.home')
    .factory('loginInitialization', ['$rootScope', '$q', 'locationService', 'spinner', 'messagingService', 'appService',
        function ($rootScope, $q, locationService, spinner, messagingService, appService) {
            var initApp = function () {
                return appService.initApp('home', {
                    'app': true,
                    'extension': true
                });
            };

            var init = function () {
                var deferrable = $q.defer();
                locationService.getAllByTag("Login Location").then(
                    function (response) {
                        deferrable.resolve({locations: response.data.results});
                    },
                    function (response) {
                        deferrable.reject();
                        if (response.status) {
                            response = 'MESSAGE_START_OPENMRS';
                        }
                        messagingService.showMessage('error', response);
                    }
                );
                return deferrable.promise;
            };

            return function () {
                spinner.forPromise(initApp());
                return spinner.forPromise(init());
            };
        }
    ]);
