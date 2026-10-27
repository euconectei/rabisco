import { flowchartSteps } from './flowchartSteps'

it('lists the boxes in order with their arrows and arrow labels', () => {
  const steps = flowchartSteps(`flowchart TD
  A([Start]) --> B{Is it ok?}
  B -- Yes --> C[Ship it]
  B -->|No| D[Fix it]
  D --> B
  C --> E([End])
`)
  expect(steps).toEqual([
    { label: 'Start', next: [{ label: 'Is it ok?', via: null }] },
    { label: 'Is it ok?', next: [{ label: 'Ship it', via: 'Yes' }, { label: 'Fix it', via: 'No' }] },
    { label: 'Ship it', next: [{ label: 'End', via: null }] },
    { label: 'Fix it', next: [{ label: 'Is it ok?', via: null }] },
    { label: 'End', next: [] },
  ])
})

it('ignores comments, blank lines and arrows to unknown boxes', () => {
  expect(flowchartSteps('flowchart LR\n%% note\n\n  A[One] --> Z\n')).toEqual([{ label: 'One', next: [] }])
})
