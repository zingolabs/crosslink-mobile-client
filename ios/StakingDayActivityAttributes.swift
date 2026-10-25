//
//  StakingDayActivityAttributes.swift
//  ZingoDelegator
//
//  Shared between the app and the StakingDayWidget extension targets.
//

import ActivityKit
import Foundation

struct StakingDayActivityAttributes: ActivityAttributes {
  struct ContentState: Codable, Hashable {
    var stakingDay: Bool
    var targetDate: Date
    var title: String
  }
}
