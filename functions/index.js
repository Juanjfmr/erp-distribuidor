const admin = require('firebase-admin');
admin.initializeApp();

exports.mpWebhook         = require('./mpWebhook').mpWebhook;
exports.checkOverdue      = require('./checkOverdue').checkOverdue;
exports.payAffiliate      = require('./payAffiliate').payAffiliate;
exports.createSubscription= require('./createSubscription').createSubscription;
exports.cancelSubscription = require('./cancelSubscription').cancelSubscription;
exports.registerTenant    = require('./registerTenant').registerTenant;
exports.uploadCertificate = require('./uploadCertificate').uploadCertificate;
exports.checkCertExpiry   = require('./checkCertExpiry').checkCertExpiry;
exports.aiChat            = require('./aiChat').aiChat;
