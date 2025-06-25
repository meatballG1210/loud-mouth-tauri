interface WindowTitleBarProps {
  title?: string;
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
}

export function WindowTitleBar({ 
  title = "Loud Mouth", 
  onClose, 
  onMinimize, 
  onMaximize 
}: WindowTitleBarProps) {
  return (
    <div className="macos-titlebar window-chrome">
      <div className="macos-titlebar-controls">
        <button 
          className="macos-titlebar-control close"
          onClick={onClose}
          aria-label="Close window"
        />
        <button 
          className="macos-titlebar-control minimize"
          onClick={onMinimize}
          aria-label="Minimize window"
        />
        <button 
          className="macos-titlebar-control maximize"
          onClick={onMaximize}
          aria-label="Maximize window"
        />
      </div>
      <div className="macos-titlebar-title macos-footnote">
        {title}
      </div>
    </div>
  );
}