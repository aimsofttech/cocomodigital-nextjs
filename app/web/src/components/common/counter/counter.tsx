// @ts-nocheck
import React, { useEffect, useState } from "react";

const Counter = ({ target }) => {
    const [count, setCount] = useState(0);

    const targetValue = parseFloat(target); // extract number
    const suffix = target.replace(/[0-9.]/g, ""); // extract +, K, M

    useEffect(() => {
        let start = 0;

        const increment = Math.ceil(targetValue / 100);

        const interval = setInterval(() => {
            start += increment;

            if (start >= targetValue) {
                start = targetValue;
                clearInterval(interval);
            }

            setCount(start);
        }, 20);

        return () => clearInterval(interval);
    }, [targetValue]);

    return (
        <h1 className="single-web-series-badge-value font-primary mb-0">
            {Math.floor(count)}
            {suffix}
        </h1>
    );
};

export default Counter;