//
//  StakingDayActivityModule.swift
//  ZingoDelegator
//

import ActivityKit
import Foundation
import React

@objc(StakingDayActivityModule)
class StakingDayActivityModule: NSObject {

  private var currentActivity: Any?

  @objc
  static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc(isAvailable:reject:)
  func isAvailable(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 16.2, *) {
      resolve(ActivityAuthorizationInfo().areActivitiesEnabled)
    } else {
      resolve(false)
    }
  }

  @objc(startActivity:targetTimestamp:title:resolve:reject:)
  func startActivity(
    stakingDay: Bool,
    targetTimestamp: Double,
    title: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 16.2, *) {
      DispatchQueue.main.async {
        Task {
          for existing in Activity<StakingDayActivityAttributes>.activities {
            await existing.end(nil, dismissalPolicy: .immediate)
          }
          await self.endCurrentActivity()
          let state = StakingDayActivityAttributes.ContentState(
            stakingDay: stakingDay,
            targetDate: Date(timeIntervalSince1970: targetTimestamp),
            title: title
          )
          do {
            self.currentActivity = try Activity.request(
              attributes: StakingDayActivityAttributes(),
              content: ActivityContent(state: state, staleDate: nil),
              pushType: nil
            )
            resolve(true)
          } catch {
            reject("START_FAILED", error.localizedDescription, error)
          }
        }
      }
    } else {
      resolve(false)
    }
  }

  @objc(updateActivity:targetTimestamp:title:resolve:reject:)
  func updateActivity(
    stakingDay: Bool,
    targetTimestamp: Double,
    title: String,
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 16.2, *) {
      DispatchQueue.main.async {
        guard
          let activity = self.currentActivity
            as? Activity<StakingDayActivityAttributes>
        else {
          resolve(false)
          return
        }
        let state = StakingDayActivityAttributes.ContentState(
          stakingDay: stakingDay,
          targetDate: Date(timeIntervalSince1970: targetTimestamp),
          title: title
        )
        Task {
          await activity.update(ActivityContent(state: state, staleDate: nil))
          resolve(true)
        }
      }
    } else {
      resolve(false)
    }
  }

  @objc(stopActivity:reject:)
  func stopActivity(
    _ resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    if #available(iOS 16.2, *) {
      DispatchQueue.main.async {
        Task {
          await self.endCurrentActivity()
          resolve(true)
        }
      }
    } else {
      resolve(false)
    }
  }

  private func endCurrentActivity() async {
    if #available(iOS 16.2, *) {
      if let activity = currentActivity
        as? Activity<StakingDayActivityAttributes>
      {
        await activity.end(nil, dismissalPolicy: .immediate)
        currentActivity = nil
      }
    }
  }
}
