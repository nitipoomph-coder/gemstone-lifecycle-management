import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { usePeriodSetup } from '../src/hooks/usePeriodSetup';

const TestComponent = ({ availableYears }: { availableYears: string[] }) => {
  const setup = usePeriodSetup({
    initialValues: { baseYear: '2026' },
    presets: ['full-year'],
    compareSlots: 2,
    availableYears,
    syncToUrl: false
  });
  
  return (
    <div>
      Base: {setup.committed.baseYear}, 
      Compare1: {setup.committed.compareYear1}, 
      Compare2: {setup.committed.compareYear2}
    </div>
  );
};

const run = () => {
  console.log('Descending:');
  console.log(renderToString(
    React.createElement(MemoryRouter, null, 
      React.createElement(TestComponent, { availableYears: ['2026', '2025', '2024'] })
    )
  ));
  
  console.log('Ascending:');
  console.log(renderToString(
    React.createElement(MemoryRouter, null, 
      React.createElement(TestComponent, { availableYears: ['2024', '2025', '2026'] })
    )
  ));
};

run();
