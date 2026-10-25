//
//  StakingDayActivityBridge.m
//  ZingoDelegator
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE (StakingDayActivityModule, NSObject)

RCT_EXTERN_METHOD(isAvailable:
    (RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(startActivity:
    (BOOL)stakingDay
                  targetTimestamp:
    (double)targetTimestamp
                  title:(NSString)title
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateActivity:
    (BOOL)stakingDay
                  targetTimestamp:
    (double)targetTimestamp
                  title:(NSString)title
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(stopActivity:
    (RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
