
                import * as React from "react"
                import SvgIcon, { SvgIconProps } from '../../components/SvgIcon';

                type SecurityProps = Omit<SvgIconProps, 'children' | 'viewBox'>;

                const Security = React.forwardRef<SVGSVGElement, SecurityProps>((props, ref) => {
                return (
                    <SvgIcon viewBox="0 0 24 24" {...props} ref={ref}>
                    <path d="M12 21.481q-3.244-.885-5.372-3.819T4.5 11.101V5.347L12 2.539l7.5 2.808V11.1q0 3.627-2.128 6.561T12 21.482m0-1.58q2.6-.825 4.3-3.3 1.7-2.476 1.7-5.5V6.376l-6-2.24-6 2.24V11.1q0 3.024 1.7 5.5t4.3 3.3m-1.98-4.073h3.96q.386 0 .645-.26a.88.88 0 0 0 .26-.644v-2.962a.88.88 0 0 0-.26-.644.88.88 0 0 0-.644-.26h-.087v-1q0-.787-.549-1.335a1.82 1.82 0 0 0-1.336-.55q-.786 0-1.335.55a1.82 1.82 0 0 0-.549 1.335v1h-.106a.87.87 0 0 0-.644.26.88.88 0 0 0-.26.644v2.962q0 .384.26.644t.644.26m.99-4.77v-1q0-.424.287-.712a.97.97 0 0 1 .712-.288q.425 0 .713.288.287.287.287.712v1z" />
                    </SvgIcon>
                );
                });

                Security.displayName = 'Security';

                export default Security;
            