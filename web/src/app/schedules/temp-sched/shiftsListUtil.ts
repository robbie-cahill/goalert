import _ from 'lodash'
import { DateTime, Interval } from 'luxon'

import {
  FlatListListItem,
  FlatListNotice,
  FlatListSub,
} from '../../lists/FlatList'
import { splitAtMidnight } from '../../util/luxon-helpers'
import { parseInterval } from '../../util/shifts'
import { Shift } from './sharedUtils'

export type Sortable<T> = T & {
  // at is the earliest point in time for a list item
  at: DateTime
  // itemType categorizes a list item
  itemType: 'subheader' | 'gap' | 'shift' | 'start' | 'end'
}

export function getSubheaderItems(
  schedInterval: Interval,
  shifts: Shift[],
  zone: string,
): Sortable<FlatListSub>[] {
  let lowerBound = schedInterval.start
  let upperBound = schedInterval.end

  // loop once to set timespan
  for (const s of shifts) {
    lowerBound = DateTime.min(lowerBound, DateTime.fromISO(s.start, { zone }))
    upperBound = DateTime.max(upperBound, DateTime.fromISO(s.end, { zone }))
  }

  const dayInvs = splitAtMidnight(
    Interval.fromDateTimes(lowerBound, upperBound),
  )

  return dayInvs.map((day) => {
    const at = day.start.startOf('day')
    return {
      id: 'header_' + at.toISO(),
      subHeader: day.start.toFormat('cccc, LLLL d'),
      at,
      itemType: 'subheader',
    }
  })
}

export function getCoverageGapItems(
  schedInterval: Interval,
  shifts: Shift[],
  zone: string,
): Sortable<FlatListNotice>[] {
  const shiftIntervals = shifts.map((s) => parseInterval(s, zone))
  const gapIntervals = _.flatMap(
    schedInterval.difference(...shiftIntervals),
    (inv) => splitAtMidnight(inv),
  )
  return gapIntervals.map((gap) => ({
    id: 'day-no-coverage_' + gap.start.toISO(),
    type: 'WARNING',
    message: '', // TODO include times + unit test them
    details: 'No coverage',
    at: gap.start,
    itemType: 'gap',
  }))
}

export function sortItems(
  items: Sortable<FlatListListItem>[],
): Sortable<FlatListListItem>[] {
  return items.sort((a, b) => {
    if (a.at < b.at) return -1
    if (a.at > b.at) return 1

    // a and b are at same time; use item type priority instead
    // subheaders first
    if (a.itemType === 'subheader') return -1
    if (b.itemType === 'subheader') return 1
    // then start notice
    if (a.itemType === 'start') return -1
    if (b.itemType === 'start') return 1
    // then gaps
    if (a.itemType === 'gap') return -1
    if (b.itemType === 'gap') return 1
    // then shifts
    if (a.itemType === 'shift') return -1
    if (b.itemType === 'shift') return 1
    // then end notice
    if (a.itemType === 'end') return -1
    if (b.itemType === 'end') return 1

    // identical items; should never get to this point
    return 0
  })
}
