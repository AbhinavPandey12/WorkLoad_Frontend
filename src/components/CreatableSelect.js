import React, { useState, useRef, useEffect } from 'react';
import { theme } from '../utils/theme';

const CreatableSelect = ({
    options = [],
    value,
    onChange,
    placeholder = "Select or type...",
    disabled = false,
    className = "",
    style = {}
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value || "");
    const [filteredOptions, setFilteredOptions] = useState(options);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        setInputValue(value || "");
    }, [value]);

    useEffect(() => {
        if (!isOpen) {
            // When closing, reset filter but keep input value
            setFilteredOptions(options);
        } else {
            // Filter based on current input
            const lower = inputValue.toLowerCase();
            const filtered = options.filter(opt =>
                opt.toLowerCase().includes(lower)
            );
            setFilteredOptions(filtered);
        }
    }, [options, inputValue, isOpen]);

    useEffect(() => {
        // Handle outside click
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
                // Ensure the parent gets the final value if they haven't already
                if (inputValue !== value) {
                    onChange({ target: { value: inputValue } });
                }
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [inputValue, onChange, value]);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputValue(val);
        setIsOpen(true);
        onChange(e); // Propagate change immediately for typing
    };

    const handleOptionClick = (opt) => {
        setInputValue(opt);
        onChange({ target: { value: opt } });
        setIsOpen(false);
    };

    const handleInputFocus = () => {
        if (!disabled) setIsOpen(true);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setIsOpen(false);
            // Ensure value is committed
            onChange({ target: { value: inputValue } });
            inputRef.current.blur();
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            inputRef.current.blur();
        }
    };

    const componentStyles = {
        wrapper: {
            position: 'relative',
            width: '100%',
            ...style
        },
        input: {
            width: '100%',
            padding: '10px 12px',
            borderRadius: '6px',
            border: `1px solid ${theme.colors.border || '#d1d5db'}`,
            fontSize: '14px',
            outline: 'none',
            backgroundColor: disabled ? '#f3f4f6' : '#fff',
            cursor: disabled ? 'not-allowed' : 'text',
            boxSizing: 'border-box', // Critical for width alignment
            color: theme.colors.text.primary || '#1f2937'
        },
        menu: {
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            maxHeight: '200px',
            overflowY: 'auto',
            backgroundColor: '#ffffff',
            border: `1px solid ${theme.colors.border || '#e5e7eb'}`,
            borderRadius: '6px',
            marginTop: '4px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            zIndex: 1000,
            display: isOpen ? 'block' : 'none'
        },
        option: {
            padding: '8px 12px',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#374151',
            transition: 'background-color 0.1s ease'
        },
        optionHover: {
            backgroundColor: '#f3f4f6'
        },
        noOptions: {
            padding: '8px 12px',
            color: '#9ca3af',
            fontSize: '13px',
            fontStyle: 'italic'
        }
    };

    return (
        <div ref={wrapperRef} style={componentStyles.wrapper} className={className}>
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                style={componentStyles.input}
                className={disabled ? "" : "modern-input"} // Re-use global class if applicable, but style overrides are safer
            />
            {isOpen && !disabled && (
                <div style={componentStyles.menu}>
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((opt, idx) => (
                            <div
                                key={idx}
                                style={componentStyles.option}
                                onMouseDown={(e) => {
                                    e.preventDefault(); // Prevent input blur before click is registered
                                    handleOptionClick(opt);
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                                {opt}
                            </div>
                        ))
                    ) : (
                        <div style={componentStyles.noOptions}>
                            "{inputValue}" will be created
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CreatableSelect;
