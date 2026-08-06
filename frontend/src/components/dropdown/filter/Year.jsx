import * as React from 'react';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputAdornment from '@mui/material/InputAdornment';
import { Calendar01 } from '../../template/TemplateIcons.jsx';

export default function YearPrjPerform({ value, onChange }) {
  const id = React.useId();
  const placeholder = 'Semua Tahun';

  const handleChange = (event) => {
    onChange?.(event.target.value);
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <FormControl fullWidth sx={{ minWidth: 140 }} size="small">
      <InputLabel 
        id={`${id}-label`}
        sx={{ 
          fontSize: '0.875rem',
          color: '#64748b',
          backgroundColor: '#ffffff',
          px: 1,
          ml: -0.5,
          '&.Mui-focused': { color: '#10b981' }
        }}
      >
        Tahun
      </InputLabel>
      <Select
        labelId={`${id}-label`}
        id={id}
        value={value ?? ''}
        label="Tahun"
        onChange={handleChange}
        displayEmpty
        renderValue={(selected) => (
          <span style={{ color: selected ? '#1e293b' : '#94a3b8' }}>
            {selected || placeholder}
          </span>
        )}
        startAdornment={
          <InputAdornment position="start" sx={{ ml: 1, mr: 0.5 }}>
            <Calendar01 size={16} color="#94a3b8" />
          </InputAdornment>
        }
        sx={{
          borderRadius: '999px',
          backgroundColor: '#ffffff',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: '#1e293b',
          minHeight: '48px',
          transition: 'all 0.2s ease',
          boxShadow: '0 10px 22px rgba(26, 42, 87, 0.08)',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#e2e8f0',
            borderWidth: '1px',
            borderRadius: '999px',
          },
          '&:hover': {
            backgroundColor: '#f8fafc',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#cbd5e1',
            },
          },
          '&.Mui-focused': {
            backgroundColor: '#ffffff',
            boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.1)',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#10b981',
              borderWidth: '1.5px',
            },
          },
          '& .MuiSelect-select': {
            py: 1.5,
            pl: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          },
        }}
        MenuProps={{
          PaperProps: {
            sx: {
              borderRadius: '12px',
              marginTop: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              border: '1px solid #f1f5f9',
              '& .MuiMenuItem-root': {
                fontSize: '0.875rem',
                mx: 0.5,
                my: 0.25,
                borderRadius: '8px',
                '&:hover': {
                  backgroundColor: '#f0fdf4',
                  color: '#10b981',
                },
                '&.Mui-selected': {
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  '&:hover': {
                    backgroundColor: '#059669',
                  },
                },
              },
            },
          },
        }}
      >
        <MenuItem value="">
          {placeholder}
        </MenuItem>
        {years.map((year) => (
          <MenuItem key={year} value={year.toString()}>
            {year}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
