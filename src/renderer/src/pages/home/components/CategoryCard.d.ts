import React from 'react';
interface CategoryCardProps {
    readonly icon: React.ElementType;
    readonly labelKey: string;
    readonly descriptionKey: string;
    readonly accent: string;
    readonly onClick: () => void;
    readonly disabled?: boolean;
}
export declare const CategoryCard: React.NamedExoticComponent<CategoryCardProps>;
export {};
