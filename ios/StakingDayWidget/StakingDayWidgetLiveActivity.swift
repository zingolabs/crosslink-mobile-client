//
//  StakingDayWidgetLiveActivity.swift
//  StakingDayWidget
//

import ActivityKit
import SwiftUI
import WidgetKit

private let surface = Color(red: 0x22 / 255.0, green: 0x22 / 255.0, blue: 0x23 / 255.0)
private let successTint = Color(red: 0.15, green: 0.68, blue: 0.38)
private let warningTint = Color(red: 0.96, green: 0.75, blue: 0.20)

private func accent(forActive isActive: Bool) -> Color {
  isActive ? successTint : warningTint
}

private func caption(forActive isActive: Bool) -> String {
  isActive ? "Staking day active" : "Staking day inactive"
}

private let logo = Image("logo")

private func countdown(_ date: Date) -> Text {
  Text(timerInterval: Date.now...date, countsDown: true)
}

private struct TitleText: View {
  let title: String
  var body: some View {
    Text(title)
      .font(.caption)
      .foregroundStyle(.white.opacity(0.7))
      .lineLimit(1)
  }
}

private struct TimeColumn: View {
  let date: Date
  let active: Bool
  let hero: Font.TextStyle

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      countdown(date)
        .font(.system(hero, design: .rounded).weight(.semibold))
        .foregroundStyle(.white)
        .monospacedDigit()
        .lineLimit(1)
        .minimumScaleFactor(0.6)
      TitleText(title: caption(forActive: active))
    }
  }
}

struct StakingDayLiveActivityView: View {
  let context: ActivityViewContext<StakingDayActivityAttributes>

  var body: some View {
    let active = context.state.stakingDay
    HStack(spacing: 12) {
      logo
        .resizable()
        .scaledToFit()
        .frame(height: 28)
      TimeColumn(
        date: context.state.targetDate,
        active: active,
        hero: .title2
      )
      Spacer(minLength: 8)
    }
    .padding(14)
  }
}

struct StakingDayWidgetLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: StakingDayActivityAttributes.self) { context in
      StakingDayLiveActivityView(context: context)
        .activityBackgroundTint(surface)
        .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      let active = context.state.stakingDay
      return DynamicIsland {
        DynamicIslandExpandedRegion(.center) {
          HStack(spacing: 10) {
            logo
              .resizable()
              .scaledToFit()
              .frame(height: 26)
            TimeColumn(
              date: context.state.targetDate,
              active: active,
              hero: .title3
            )
            Spacer(minLength: 8)
          }
        }
      } compactLeading: {
        logo
          .resizable()
          .scaledToFit()
          .frame(height: 16)
      } compactTrailing: {
        countdown(context.state.targetDate)
          .font(.system(.caption, design: .rounded).weight(.semibold))
          .foregroundStyle(.white)
          .monospacedDigit()
          .frame(maxWidth: 44)
      } minimal: {
        logo
          .resizable()
          .scaledToFit()
          .frame(height: 16)
      }
      .keylineTint(accent(forActive: active))
    }
  }
}

@main
struct StakingDayWidgetBundle: WidgetBundle {
  var body: some Widget {
    StakingDayWidgetLiveActivity()
  }
}
