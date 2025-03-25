
interface BookmarksProps {
    title: string;
    description: string;
    action: () => void;
}


export default function Bookmarks({ title, description, action }: BookmarksProps) {
    return (
        <div>
            <h4>{title}</h4>
            <p>{description}</p>
            <button onClick={action}>
                <span>{description}</span>
            </button>
        </div>
    )
}
