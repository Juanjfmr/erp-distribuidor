const admin = require('firebase-admin');
admin.initializeApp();

exports.mpWebhook = require('./mpWebhook').mpWebhook;
exports.checkOverdue = require('./checkOverdue').checkOverdue;
exports.payAffiliate = require('./payAffiliate').payAffiliate;
exports.createSubscription = require('./createSubscription').createSubscription;
exports.registerTenant    = require('./registerTenant').registerTenant;
exports.uploadCertificate = require('./uploadCertificate').uploadCertificate;
