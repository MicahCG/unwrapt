import { Mic } from 'lucide-react';

type VoiceDictateButtonProps = {
  listening: boolean;
  disabled?: boolean;
  onClick: () => void;
};

/** Mic control beside the chat field. Speech is written into the field; the user still sends it. */
export const VoiceDictateButton: React.FC<VoiceDictateButtonProps> = ({
  listening,
  disabled = false,
  onClick,
}) => (
  <button
    type="button"
    disabled={disabled}
    aria-pressed={listening}
    aria-label={listening ? 'Stop voice input' : 'Dictate a message'}
    onClick={onClick}
    className="u-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full border disabled:opacity-35"
    style={{
      background: listening ? '#F7E4DA' : '#FFFDF8',
      borderColor: listening ? '#B65B3C' : 'rgba(42,37,32,0.12)',
      color: '#B65B3C',
    }}
  >
    <Mic className="h-4 w-4" aria-hidden="true" />
  </button>
);

export default VoiceDictateButton;
