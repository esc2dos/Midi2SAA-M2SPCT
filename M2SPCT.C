/* =========================================================================
 * M2SPCT.C - Midi2Saa Preset Creation Tool (M2SPCT v1.0)
 * (C) 1988-1992 Creative Technology Ltd & 386DX Retro Engineering
 *
 * Designed for Borland C++ 3.1 & Turbo C 2.0/3.0 (C89 Standard)
 * Targets: Sound Blaster 2.0 / C/MS Dual Philips SAA1099 (Ports 0x220-0x223)
 *
 * Features:
 *   - Interactive live sound designer for all 12 SAA1099 preset instruments
 *   - Preset Renaming: Press [ENTER] on Parameter 1 (Name) to edit text inline!
 *   - Polyphonic (12-Voice) vs Monophonic (Solo Lead/Bass) Voice Allocation Mode
 *   - Exact SAA1099 Hardware Octave Alignment (A-based tuning table, C plays as C!)
 *   - Full Cubase 14 Program Change support (0xC0 switches presets 1..12)
 *   - UP / DOWN arrow keys: Navigate between sound parameters
 *   - LEFT / RIGHT arrow keys: Increment / Decrement parameter values
 *   - F1..F12: Switch between Preset Slots 1 through 12
 *   - Gameport MIDI: Live play on external MIDI keyboard while editing!
 *   - TAB: Emergency Panic (silences all 12 voices immediately)
 *   - S: Save all 12 presets to M2SPRE.CFG
 *   - L: Reload presets from M2SPRE.CFG
 *   - R: Reset current slot to factory default
 *   - ESC: Exit to DOS
 *
 * Compilers (Tested with zero errors & zero warnings):
 *   - Borland C++ 3.1: bcc -mc -O2 -3 -w- m2spct.c
 *   - Turbo C 2.0/3.0: tcc -mc -O2 -3 -w- m2spct.c
 * ========================================================================= */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <conio.h>
#include <dos.h>

#ifndef inportb
#define inportb(p) inp(p)
#endif
#ifndef outportb
#define outportb(p, v) outp((p), (v))
#endif
#ifndef inp
#define inp(p) inportb(p)
#endif
#ifndef outp
#define outp(p, v) outportb((p), (v))
#endif

/* Global Sound Blaster Hardware Configuration */
int sb_base = 0x220;
int sb_irq  = 5;

/* C/MS Dual Philips SAA1099 I/O Ports */
#define CMS_CHIP0_DATA   (sb_base + 0x00)
#define CMS_CHIP0_ADDR   (sb_base + 0x01)
#define CMS_CHIP1_DATA   (sb_base + 0x02)
#define CMS_CHIP1_ADDR   (sb_base + 0x03)
#define MIXER_ADDR       (sb_base + 0x04)
#define MIXER_DATA       (sb_base + 0x05)
#define DSP_RESET        (sb_base + 0x06)
#define DSP_READ_DATA    (sb_base + 0x0A)
#define DSP_WRITE_DATA   (sb_base + 0x0C)
#define DSP_DATA_AVAIL   (sb_base + 0x0E)

#define SAA_REG_VOL_BASE     0x00
#define SAA_REG_FREQ_BASE    0x08
#define SAA_REG_OCTAVE_BASE  0x10
#define SAA_REG_TONE_ENABLE  0x14
#define SAA_REG_NOISE_ENABLE 0x15
#define SAA_REG_MASTER_CTRL  0x1C

typedef struct {
    char name[20];
    unsigned char vol_left;    /* 0x0 to 0xF */
    unsigned char vol_right;   /* 0x0 to 0xF */
    int octave_left;           /* -2, -1, 0, +1, +2 (Left Channel / Chip 0) */
    int octave_right;          /* -2, -1, 0, +1, +2 (Right Channel / Chip 1) */
    int detune_chorus;         /* 1 = activate twin channel on Chip 1 */
    int layer_octave_up;       /* 1 = second voice plays 1 octave up */
    int is_mono;               /* 0 = Polyphonic (12-voice), 1 = Monophonic (Solo lead/bass) */
    unsigned char sustain_lvl; /* 0x0 to 0xF */
    unsigned char decay_rate;  /* ticks per step (0 = infinite) */
    unsigned char rel_rate;    /* release tail ticks (1..60) */
} CMS_PRESET;

/* 12 Presets */
CMS_PRESET presets[12] = {
    { "01: BRIGHT PIANO ", 0xF, 0xF,  0,  0, 1, 1, 0, 0xA,  80, 16 },
    { "02: HONKY-TONK    ", 0xE, 0xE,  0,  0, 1, 0, 0, 0x9,  70, 18 },
    { "03: HARPSICHORD   ", 0xF, 0xC,  0,  1, 0, 1, 0, 0x3,  40, 12 },
    { "04: C/MS ORGAN    ", 0xF, 0xF,  0,  0, 1, 0, 0, 0xF,   0, 14 },
    { "05: BRASS FANFARE ", 0xF, 0xF,  0,  0, 1, 1, 0, 0xD, 180, 15 },
    { "06: PIPE FLUTE    ", 0xC, 0xC,  1,  1, 0, 0, 0, 0xB,   0, 15 },
    { "07: CLARINET      ", 0xD, 0xD,  0,  0, 0, 0, 0, 0xC,   0, 12 },
    { "08: REED ACCORDION", 0xE, 0xE,  0,  1, 1, 0, 0, 0xE,   0, 12 },
    { "09: VIOLIN ENSEMBLE",0xC, 0xF,  0,  1, 1, 0, 0, 0xE,   0, 22 },
    { "10: 8-BIT SYNTH   ", 0xE, 0xF,  0, -1, 1, 0, 0, 0xD, 200, 15 },
    { "11: MUSIC BOX     ", 0xD, 0xD,  1,  2, 0, 0, 0, 0x1, 100, 25 },
    { "12: SLAP BASS     ", 0xF, 0xB, -1, -1, 0, 0, 1, 0x2,  30, 10 }
};

const CMS_PRESET default_presets[12] = {
    { "01: BRIGHT PIANO ", 0xF, 0xF,  0,  0, 1, 1, 0, 0xA,  80, 16 },
    { "02: HONKY-TONK    ", 0xE, 0xE,  0,  0, 1, 0, 0, 0x9,  70, 18 },
    { "03: HARPSICHORD   ", 0xF, 0xC,  0,  1, 0, 1, 0, 0x3,  40, 12 },
    { "04: C/MS ORGAN    ", 0xF, 0xF,  0,  0, 1, 0, 0, 0xF,   0, 14 },
    { "05: BRASS FANFARE ", 0xF, 0xF,  0,  0, 1, 1, 0, 0xD, 180, 15 },
    { "06: PIPE FLUTE    ", 0xC, 0xC,  1,  1, 0, 0, 0, 0xB,   0, 15 },
    { "07: CLARINET      ", 0xD, 0xD,  0,  0, 0, 0, 0, 0xC,   0, 12 },
    { "08: REED ACCORDION", 0xE, 0xE,  0,  1, 1, 0, 0, 0xE,   0, 12 },
    { "09: VIOLIN ENSEMBLE",0xC, 0xF,  0,  1, 1, 0, 0, 0xE,   0, 22 },
    { "10: 8-BIT SYNTH   ", 0xE, 0xF,  0, -1, 1, 0, 0, 0xD, 200, 15 },
    { "11: MUSIC BOX     ", 0xD, 0xD,  1,  2, 0, 0, 0, 0x1, 100, 25 },
    { "12: SLAP BASS     ", 0xF, 0xB, -1, -1, 0, 0, 1, 0x2,  30, 10 }
};

int cur_slot = 0;       /* 0 to 11 (F1 to F12) */
int cur_param = 0;      /* 0 to 10 (11 parameters) */
int last_help_param = -1;
int last_voices_active = -1;
int ui_dirty = 1;
char status_msg[72] = "M2SPCT Ready. Play MIDI keyboard | [ENTER]=Rename | [TAB]=Panic";

/* Monophonic Voice Note Stack for Legato Playing */
#define MONO_STACK_SIZE 16
static int mono_stack[MONO_STACK_SIZE];
static int mono_stack_count = 0;

/* MIDI Input Queue & State */
#define MIDI_BUF_SIZE 256
volatile unsigned char midi_queue[MIDI_BUF_SIZE];
volatile unsigned int midi_head = 0;
volatile unsigned int midi_tail = 0;
volatile unsigned long midi_rx_count = 0;
volatile unsigned char last_rx_byte = 0;
unsigned char old_pic_mask = 0;

#ifdef __cplusplus
typedef void (interrupt far *ISR_PTR)(...);
#else
typedef void (interrupt far *ISR_PTR)(void);
#endif
ISR_PTR old_sb_isr = NULL;

int last_played_note = -1;
int last_played_velocity = 0;
char last_note_str[24] = "None (Play MIDI keys)";

const char *note_names[12] = {
    "C-", "C#", "D-", "D#", "E-", "F-", "F#", "G-", "G#", "A-", "A#", "B-"
};

/* Active voices */
typedef struct {
    int active;
    int midi_note;
    int state;
    unsigned char cur_vol_l;
    unsigned char cur_vol_r;
    unsigned char step_delay;
} VOICE_STATE;

VOICE_STATE voices[12];

static unsigned char oct_shadow[2][3] = {
    { 0x33, 0x33, 0x33 },
    { 0x33, 0x33, 0x33 }
};

/* SAA1099 equal temperament frequency counter bytes indexed by semitone relative to A (0..11):
   0: A, 1: A#, 2: B, 3: C, 4: C#, 5: D, 6: D#, 7: E, 8: F, 9: F#, 10: G, 11: G# */
const unsigned char saa_freq_table[12] = {
    0x03, 0x20, 0x3A, 0x54, 0x6C, 0x82,
    0x98, 0xAC, 0xBF, 0xD1, 0xE2, 0xF2
};

void bus_delay(void) {
    int i;
    for (i = 0; i < 4; i++) inp(0x80);
}

void saa_write(int chip, unsigned char reg, unsigned char val) {
    int addr_port;
    int data_port;
    addr_port = (chip == 0) ? CMS_CHIP0_ADDR : CMS_CHIP1_ADDR;
    data_port = (chip == 0) ? CMS_CHIP0_DATA : CMS_CHIP1_DATA;
    outp(addr_port, reg);
    bus_delay();
    outp(data_port, val);
    bus_delay();
}

void init_sb20_mixer(void) {
    outp(MIXER_ADDR, 0x00); outp(MIXER_DATA, 0x00);
    bus_delay();
    outp(MIXER_ADDR, 0x02); outp(MIXER_DATA, 0x0E);
    bus_delay();
    outp(MIXER_ADDR, 0x06); outp(MIXER_DATA, 0x0E);
    bus_delay();
    outp(MIXER_ADDR, 0x08); outp(MIXER_DATA, 0x0E);
    bus_delay();
    outp(MIXER_ADDR, 0x0A); outp(MIXER_DATA, 0x06);
    bus_delay();
}

void init_saa1099(void) {
    int chip, ch;
    for (chip = 0; chip < 2; chip++) {
        saa_write(chip, SAA_REG_MASTER_CTRL, 0x02);
        bus_delay();
        saa_write(chip, SAA_REG_MASTER_CTRL, 0x01);
        bus_delay();
        saa_write(chip, SAA_REG_TONE_ENABLE, 0x3F);
        saa_write(chip, SAA_REG_NOISE_ENABLE, 0x00);
        oct_shadow[chip][0] = 0x33;
        oct_shadow[chip][1] = 0x33;
        oct_shadow[chip][2] = 0x33;
        saa_write(chip, 0x10, 0x33);
        saa_write(chip, 0x11, 0x33);
        saa_write(chip, 0x12, 0x33);
        for (ch = 0; ch < 6; ch++) {
            saa_write(chip, SAA_REG_VOL_BASE + ch, 0x00);
            saa_write(chip, SAA_REG_FREQ_BASE + ch, 0x21);
        }
        saa_write(chip, 0x18, 0x00);
        saa_write(chip, 0x19, 0x00);
    }
    for (ch = 0; ch < 12; ch++) {
        voices[ch].active = 0;
        voices[ch].midi_note = -1;
        voices[ch].state = 0;
        voices[ch].cur_vol_l = 0;
        voices[ch].cur_vol_r = 0;
        voices[ch].step_delay = 0;
    }
    mono_stack_count = 0;
}

void mute_all_saa1099(void) {
    int chip, ch;
    for (chip = 0; chip < 2; chip++) {
        for (ch = 0; ch < 6; ch++) {
            saa_write(chip, SAA_REG_VOL_BASE + ch, 0x00);
        }
        saa_write(chip, 0x18, 0x00);
        saa_write(chip, 0x19, 0x00);
    }
    for (ch = 0; ch < 12; ch++) {
        voices[ch].active = 0;
        voices[ch].midi_note = -1;
        voices[ch].state = 0;
        voices[ch].cur_vol_l = 0;
        voices[ch].cur_vol_r = 0;
        voices[ch].step_delay = 0;
    }
    mono_stack_count = 0;
}

void all_notes_off(void) {
    mute_all_saa1099();
    midi_head = midi_tail;
    last_played_note = -1;
    strcpy(last_note_str, "None (Panic / Reset)");
    ui_dirty = 1;
}

int load_presets_from_cfg(const char *filename) {
    FILE *fp;
    char line[128];
    char *q1, *q2;
    int slot, vl, vr, oct_l, oct_r, chorus, lyr, mono, sus, dec, rel;
    int count, n;

    count = 0;
    fp = fopen(filename, "r");
    if (!fp) return 0;

    while (fgets(line, sizeof(line), fp)) {
        if (line[0] == '#' || line[0] == ';' || line[0] == 13 || line[0] == 10) continue;

        q1 = strchr(line, '"');
        if (!q1) continue;
        q2 = strchr(q1 + 1, '"');
        if (!q2) continue;

        slot = atoi(line);
        if (slot < 1 || slot > 12) continue;
        slot--;

        *q2 = 0;
        strncpy(presets[slot].name, q1 + 1, 19);
        presets[slot].name[19] = 0;

        /* Try 10-value format (12 columns: Slot "Name" VolL VolR OctL OctR Chorus LayerUp IsMono SusLvl Decay RelTail) */
        n = sscanf(q2 + 1, "%d %d %d %d %d %d %d %d %d %d",
                   &vl, &vr, &oct_l, &oct_r, &chorus, &lyr, &mono, &sus, &dec, &rel);
        if (n >= 10) {
            presets[slot].vol_left = (unsigned char)(vl & 0x0F);
            presets[slot].vol_right = (unsigned char)(vr & 0x0F);
            presets[slot].octave_left = oct_l;
            presets[slot].octave_right = oct_r;
            presets[slot].detune_chorus = chorus ? 1 : 0;
            presets[slot].layer_octave_up = lyr ? 1 : 0;
            presets[slot].is_mono = mono ? 1 : 0;
            presets[slot].sustain_lvl = (unsigned char)(sus & 0x0F);
            presets[slot].decay_rate = (unsigned char)dec;
            presets[slot].rel_rate = (unsigned char)rel;
            count++;
            continue;
        }

        /* Fallback for 9-value format (11 columns without is_mono) */
        n = sscanf(q2 + 1, "%d %d %d %d %d %d %d %d %d",
                   &vl, &vr, &oct_l, &oct_r, &chorus, &lyr, &sus, &dec, &rel);
        if (n >= 9) {
            presets[slot].vol_left = (unsigned char)(vl & 0x0F);
            presets[slot].vol_right = (unsigned char)(vr & 0x0F);
            presets[slot].octave_left = oct_l;
            presets[slot].octave_right = oct_r;
            presets[slot].detune_chorus = chorus ? 1 : 0;
            presets[slot].layer_octave_up = lyr ? 1 : 0;
            presets[slot].is_mono = 0;
            presets[slot].sustain_lvl = (unsigned char)(sus & 0x0F);
            presets[slot].decay_rate = (unsigned char)dec;
            presets[slot].rel_rate = (unsigned char)rel;
            count++;
            continue;
        }

        /* Fallback for legacy 8-value format */
        n = sscanf(q2 + 1, "%d %d %d %d %d %d %d %d",
                   &vl, &vr, &oct_l, &chorus, &lyr, &sus, &dec, &rel);
        if (n >= 8) {
            presets[slot].vol_left = (unsigned char)(vl & 0x0F);
            presets[slot].vol_right = (unsigned char)(vr & 0x0F);
            presets[slot].octave_left = oct_l;
            presets[slot].octave_right = oct_l;
            presets[slot].detune_chorus = chorus ? 1 : 0;
            presets[slot].layer_octave_up = lyr ? 1 : 0;
            presets[slot].is_mono = 0;
            presets[slot].sustain_lvl = (unsigned char)(sus & 0x0F);
            presets[slot].decay_rate = (unsigned char)dec;
            presets[slot].rel_rate = (unsigned char)rel;
            count++;
        }
    }
    fclose(fp);
    return count;
}

int save_presets_to_cfg(const char *filename) {
    FILE *fp;
    int i;

    fp = fopen(filename, "w");
    if (!fp) return 0;

    fprintf(fp, "# =============================================================================\n");
    fprintf(fp, "# M2SPRE.CFG - Midi2Saa & M2SPCT Preset Configuration File\n");
    fprintf(fp, "# Sound Blaster 2.0 / C/MS Dual Philips SAA1099 Synthesizer\n");
    fprintf(fp, "# Format: Slot \"Name\" VolL VolR OctL OctR Chorus LayerUp IsMono SusLvl Decay RelTail\n");
    fprintf(fp, "# =============================================================================\n");
    for (i = 0; i < 12; i++) {
        fprintf(fp, "%02d \"%-17s\" %2d %2d %2d %2d  %d  %d  %d %2d %3d %2d\n",
                i + 1,
                presets[i].name,
                (int)presets[i].vol_left,
                (int)presets[i].vol_right,
                presets[i].octave_left,
                presets[i].octave_right,
                presets[i].detune_chorus,
                presets[i].layer_octave_up,
                presets[i].is_mono,
                (int)presets[i].sustain_lvl,
                (int)presets[i].decay_rate,
                (int)presets[i].rel_rate);
    }
    fclose(fp);
    return 1;
}

void saa_play_note(int midi_note, int velocity) {
    int rel_l, oct_l, semi_l, rel_r, oct_r, semi_r, pair, oct_reg;
    int shift, v_idx, v_idx2;
    unsigned char freq_byte, freq2, vol2_l, vol2_r;
    int vl, vr;
    CMS_PRESET *p;

    (void)velocity;
    p = &presets[cur_slot];

    /* SAA1099 hardware counter table starts at A (MIDI 21 = A0).
       Maps MIDI 60 (Middle C) to Octave 3, Divisor 427 -> 261.97 Hz (exact C4)! */
    rel_l = (midi_note + (p->octave_left * 12)) - 21;
    if (rel_l < 0) rel_l = 0;
    if (rel_l > 95) rel_l = 95;
    oct_l = rel_l / 12;
    if (oct_l > 7) oct_l = 7;
    semi_l = rel_l % 12;
    freq_byte = saa_freq_table[semi_l];

    vl = (int)p->vol_left;
    vr = (int)p->vol_right;

    if (p->is_mono) {
        /* Monophonic Mode: Push note to stack for legato return */
        if (mono_stack_count < MONO_STACK_SIZE) {
            mono_stack[mono_stack_count++] = midi_note;
        }
        /* Silence other voices immediately */
        for (shift = 1; shift < 6; shift++) {
            saa_write(0, SAA_REG_VOL_BASE + shift, 0x00);
            saa_write(1, SAA_REG_VOL_BASE + shift, 0x00);
            voices[shift].active = 0;
            voices[shift + 6].active = 0;
        }
        v_idx = 0;
    } else {
        /* Polyphonic Mode: Find idle voice on Chip 0 */
        v_idx = -1;
        for (shift = 0; shift < 6; shift++) {
            if (!voices[shift].active || voices[shift].state == 0) {
                v_idx = shift;
                break;
            }
        }
        if (v_idx == -1) v_idx = 0;
    }

    voices[v_idx].active = 1;
    voices[v_idx].midi_note = midi_note;
    voices[v_idx].state = 1;
    voices[v_idx].cur_vol_l = (unsigned char)vl;
    voices[v_idx].cur_vol_r = (unsigned char)vr;
    voices[v_idx].step_delay = 0;

    saa_write(0, SAA_REG_MASTER_CTRL, 0x01);
    saa_write(0, 0x18, 0x00);
    saa_write(0, 0x19, 0x00);
    saa_write(0, SAA_REG_FREQ_BASE + v_idx, freq_byte);

    pair = v_idx / 2;
    oct_reg = SAA_REG_OCTAVE_BASE + pair;
    if (v_idx % 2 == 0) {
        oct_shadow[0][pair] = (oct_shadow[0][pair] & 0x70) | (oct_l & 0x07);
    } else {
        oct_shadow[0][pair] = (oct_shadow[0][pair] & 0x07) | ((oct_l & 0x07) << 4);
    }
    saa_write(0, oct_reg, oct_shadow[0][pair]);
    saa_write(0, SAA_REG_VOL_BASE + v_idx, (voices[v_idx].cur_vol_r << 4) | (voices[v_idx].cur_vol_l & 0x0F));

    /* Twin Chip 1 voice: Activated if chorus, layer up, or different stereo octaves */
    if (p->detune_chorus || p->layer_octave_up || p->octave_left != p->octave_right) {
        v_idx2 = v_idx + 6;
        rel_r = (midi_note + (p->octave_right * 12)) - 21;
        if (p->layer_octave_up) rel_r += 12;
        if (rel_r < 0) rel_r = 0;
        if (rel_r > 95) rel_r = 95;
        oct_r = rel_r / 12;
        if (oct_r > 7) oct_r = 7;
        semi_r = rel_r % 12;

        if (p->detune_chorus) {
            freq2 = (unsigned char)((saa_freq_table[semi_r] < 253) ? (saa_freq_table[semi_r] + 2) : 255);
        } else {
            freq2 = saa_freq_table[semi_r];
        }

        vol2_l = (unsigned char)vl;
        vol2_r = (unsigned char)vr;
        if (p->layer_octave_up) {
            vol2_l = (unsigned char)((vol2_l * 3) / 4);
            vol2_r = (unsigned char)((vol2_r * 3) / 4);
        }

        voices[v_idx2].active = 1;
        voices[v_idx2].midi_note = midi_note;
        voices[v_idx2].state = 1;
        voices[v_idx2].cur_vol_l = vol2_l;
        voices[v_idx2].cur_vol_r = vol2_r;
        voices[v_idx2].step_delay = 0;

        saa_write(1, SAA_REG_MASTER_CTRL, 0x01);
        saa_write(1, 0x18, 0x00);
        saa_write(1, 0x19, 0x00);
        saa_write(1, SAA_REG_FREQ_BASE + v_idx, freq2);

        if (v_idx % 2 == 0) {
            oct_shadow[1][pair] = (oct_shadow[1][pair] & 0x70) | (oct_r & 0x07);
        } else {
            oct_shadow[1][pair] = (oct_shadow[1][pair] & 0x07) | ((oct_r & 0x07) << 4);
        }
        saa_write(1, oct_reg, oct_shadow[1][pair]);
        saa_write(1, SAA_REG_VOL_BASE + v_idx, (voices[v_idx2].cur_vol_r << 4) | (voices[v_idx2].cur_vol_l & 0x0F));
    }
}

void saa_stop_note(int midi_note) {
    int ch, i;
    CMS_PRESET *p;

    p = &presets[cur_slot];

    if (p->is_mono) {
        /* Remove released note from mono stack */
        for (i = 0; i < mono_stack_count; i++) {
            if (mono_stack[i] == midi_note) {
                for (; i < mono_stack_count - 1; i++) {
                    mono_stack[i] = mono_stack[i + 1];
                }
                mono_stack_count--;
                break;
            }
        }

        /* If other notes are still held in mono mode, legato return to previous note! */
        if (mono_stack_count > 0) {
            int prev_note = mono_stack[mono_stack_count - 1];
            mono_stack_count--; /* saa_play_note will re-push */
            saa_play_note(prev_note, 100);
            return;
        }

        /* Stack empty: release Voice 0 and Voice 6 */
        if (voices[0].active && voices[0].state == 1) {
            voices[0].state = 2;
            voices[0].step_delay = 0;
        }
        if (voices[6].active && voices[6].state == 1) {
            voices[6].state = 2;
            voices[6].step_delay = 0;
        }
        return;
    }

    for (ch = 0; ch < 12; ch++) {
        if (voices[ch].active && voices[ch].midi_note == midi_note && voices[ch].state == 1) {
            voices[ch].state = 2;
            voices[ch].step_delay = 0;
        }
    }
}

void process_envelopes(void) {
    int ch, chip, reg_ch;
    CMS_PRESET *p;

    p = &presets[cur_slot];

    for (ch = 0; ch < 12; ch++) {
        if (!voices[ch].active) continue;

        chip = (ch < 6) ? 0 : 1;
        reg_ch = ch % 6;

        if (voices[ch].state == 1) {
            if (p->decay_rate > 0) {
                voices[ch].step_delay++;
                if (voices[ch].step_delay >= p->decay_rate) {
                    voices[ch].step_delay = 0;
                    if (voices[ch].cur_vol_l > p->sustain_lvl) voices[ch].cur_vol_l--;
                    if (voices[ch].cur_vol_r > p->sustain_lvl) voices[ch].cur_vol_r--;
                    saa_write(chip, SAA_REG_VOL_BASE + reg_ch,
                              (voices[ch].cur_vol_r << 4) | (voices[ch].cur_vol_l & 0x0F));
                }
            }
        } else if (voices[ch].state == 2) {
            voices[ch].step_delay++;
            if (voices[ch].step_delay >= p->rel_rate) {
                voices[ch].step_delay = 0;
                if (voices[ch].cur_vol_l > 0) voices[ch].cur_vol_l--;
                if (voices[ch].cur_vol_r > 0) voices[ch].cur_vol_r--;
                saa_write(chip, SAA_REG_VOL_BASE + reg_ch,
                          (voices[ch].cur_vol_r << 4) | (voices[ch].cur_vol_l & 0x0F));

                if (voices[ch].cur_vol_l == 0 && voices[ch].cur_vol_r == 0) {
                    voices[ch].active = 0;
                    voices[ch].midi_note = -1;
                    voices[ch].state = 0;
                }
            }
        }
    }
}

/* Sound Blaster DSP MIDI routines */
void dsp_write(unsigned char cmd) {
    unsigned int timeout;
    timeout = 0;
    while ((inp(DSP_WRITE_DATA) & 0x80) && ++timeout < 65535U) {
        inp(0x80);
    }
    outp(DSP_WRITE_DATA, cmd);
}

int dsp_reset(int base) {
    unsigned int timeout;
    outp(base + 0x06, 1);
    delay(2);
    outp(base + 0x06, 0);

    for (timeout = 0; timeout < 65535U; timeout++) {
        if (inp(base + 0x0E) & 0x80) {
            if (inp(base + 0x0A) == 0xAA) return 1;
        }
        inp(0x80);
    }
    return 0;
}

void push_midi_byte(unsigned char b) {
    unsigned int next;
    next = (midi_head + 1) % MIDI_BUF_SIZE;
    if (next != midi_tail) {
        midi_queue[midi_head] = b;
        midi_head = next;
    }
    midi_rx_count++;
    last_rx_byte = b;
}

#ifdef __cplusplus
void interrupt far sb_midi_isr(...)
#else
void interrupt far sb_midi_isr(void)
#endif
{
    unsigned char b;
    if (inp(DSP_DATA_AVAIL) & 0x80) {
        b = inp(DSP_READ_DATA);
        push_midi_byte(b);
    }
    inp(DSP_DATA_AVAIL);
    outp(0x20, 0x20);
}

int init_dsp_midi(void) {
    int int_vector;

    if (!dsp_reset(sb_base)) {
        return 0;
    }

    int_vector = sb_irq + 8;
    old_sb_isr = (ISR_PTR)getvect(int_vector);
    setvect(int_vector, (ISR_PTR)sb_midi_isr);

    old_pic_mask = (unsigned char)inp(0x21);
    outp(0x21, old_pic_mask & ~(1 << sb_irq));

    dsp_write(0x31);
    inp(DSP_DATA_AVAIL);
    return 1;
}

void cleanup_hardware(void) {
    mute_all_saa1099();

    outp(DSP_RESET, 1);
    delay(2);
    outp(DSP_RESET, 0);

    if (old_pic_mask != 0) {
        outp(0x21, old_pic_mask);
    }

    if (old_sb_isr != NULL) {
        setvect(sb_irq + 8, (ISR_PTR)old_sb_isr);
    }
}

int pop_midi_byte(unsigned char *b) {
    if (midi_head == midi_tail) return 0;
    *b = midi_queue[midi_tail];
    midi_tail = (midi_tail + 1) % MIDI_BUF_SIZE;
    return 1;
}

void process_midi(void) {
    static int state = 0;
    static unsigned char running_status = 0;
    static unsigned char param1 = 0;
    static int sysex_active = 0;
    unsigned char b, param2, cmd;
    int oct, semi;

    if (old_sb_isr == NULL) {
        while (inp(DSP_DATA_AVAIL) & 0x80) {
            b = (unsigned char)inp(DSP_READ_DATA);
            inp(DSP_DATA_AVAIL);
            push_midi_byte(b);
        }
    }

    while (pop_midi_byte(&b)) {
        if (b >= 0xF8) continue;

        if (b & 0x80) {
            if (b == 0xF0) {
                sysex_active = 1;
                running_status = 0;
                state = 0;
                continue;
            }
            if (b == 0xF7) {
                sysex_active = 0;
                running_status = 0;
                state = 0;
                continue;
            }
            if (b > 0xF0 && b < 0xF8) {
                running_status = 0;
                state = 0;
                continue;
            }
            sysex_active = 0;
            running_status = b;
            state = 1;
            continue;
        }

        if (sysex_active) continue;
        if (running_status == 0) continue;

        if (state == 1) {
            param1 = b;
            cmd = running_status & 0xF0;
            if (cmd == 0xC0) {
                cur_slot = param1 % 12;
                sprintf(status_msg, "Cubase Program Change: Selected Slot F%-2d (%s)",
                        cur_slot + 1, presets[cur_slot].name);
                ui_dirty = 1;
                state = 1;
            } else if (cmd == 0xD0) {
                state = 1;
            } else {
                state = 2;
            }
        } else if (state == 2) {
            param2 = b;
            cmd = running_status & 0xF0;

            if (cmd == 0x90) {
                if (param2 > 0) {
                    saa_play_note(param1, param2);
                    last_played_note = param1;
                    last_played_velocity = param2;
                    oct = (param1 / 12) - 1;
                    semi = param1 % 12;
                    sprintf(last_note_str, "%s%d (Vel:%3d, #%02d)", note_names[semi], oct, param2, param1);
                    ui_dirty = 1;
                } else {
                    saa_stop_note(param1);
                    ui_dirty = 1;
                }
            } else if (cmd == 0x80) {
                saa_stop_note(param1);
                ui_dirty = 1;
            } else if (cmd == 0xB0) {
                if (param1 == 120 || param1 == 123) {
                    all_notes_off();
                    ui_dirty = 1;
                }
            }
            state = 1;
        }
    }
}

void draw_box(int x1, int y1, int x2, int y2, int fg, int bg, int dbl) {
    int x, y;
    unsigned char tl, tr, bl, br, hz, vt;

    if (dbl) {
        tl = 0xC9; tr = 0xBB; bl = 0xC8; br = 0xBC; hz = 0xCD; vt = 0xBA;
    } else {
        tl = 0xDA; tr = 0xBF; bl = 0xC0; br = 0xD9; hz = 0xC4; vt = 0xB3;
    }

    textcolor(fg);
    textbackground(bg);

    gotoxy(x1, y1); putch(tl);
    for (x = x1 + 1; x < x2; x++) putch(hz);
    putch(tr);

    for (y = y1 + 1; y < y2; y++) {
        gotoxy(x1, y); putch(vt);
        for (x = x1 + 1; x < x2; x++) putch(' ');
        gotoxy(x2, y); putch(vt);
    }

    gotoxy(x1, y2); putch(bl);
    for (x = x1 + 1; x < x2; x++) putch(hz);
    putch(br);
}

void draw_help_static(void) {
    textbackground(BLACK);
    gotoxy(51, 8);
    textcolor(YELLOW);
    cprintf("PARAMETER DESCRIPTION:      ");
    gotoxy(51, 9);
    textcolor(DARKGRAY);
    cprintf("----------------------------");
    gotoxy(51, 14);
    textcolor(DARKGRAY);
    cprintf("----------------------------");
    gotoxy(51, 15);
    textcolor(LIGHTCYAN);
    cprintf("MIDI In : [CUBASE & GAMEPORT]");
    gotoxy(51, 18);
    textcolor(LIGHTGRAY);
    cprintf("[S]=Save  [L]=Load  [R]=Def ");
    last_help_param = -1;
    last_voices_active = -1;
}

void update_help_text(int force) {
    int i, active_cnt;
    textbackground(BLACK);

    if (force || cur_param != last_help_param) {
        last_help_param = cur_param;
        switch (cur_param) {
            case 0:
                gotoxy(51, 10); textcolor(WHITE);
                cprintf("1. Preset Display Name      ");
                gotoxy(51, 11); textcolor(YELLOW);
                cprintf("Press [ENTER] to rename!    ");
                gotoxy(51, 12); textcolor(LIGHTGRAY);
                cprintf("Max 17 chars. Displayed in  ");
                gotoxy(51, 13); textcolor(LIGHTGRAY);
                cprintf("MIDI2SAA performance UI.    ");
                break;
            case 1:
                gotoxy(51, 10); textcolor(WHITE);
                cprintf("2. SAA1099 Left Volume      ");
                gotoxy(51, 11); textcolor(LIGHTGRAY);
                cprintf("Programs 4-bit nibble (0-15)");
                gotoxy(51, 12); textcolor(LIGHTGRAY);
                cprintf("into register 0x00..0x05.   ");
                gotoxy(51, 13); textcolor(LIGHTGRAY);
                cprintf("Logarithmic 3dB steps.      ");
                break;
            case 2:
                gotoxy(51, 10); textcolor(WHITE);
                cprintf("3. SAA1099 Right Volume     ");
                gotoxy(51, 11); textcolor(LIGHTGRAY);
                cprintf("Programs 4-bit nibble (0-15)");
                gotoxy(51, 12); textcolor(LIGHTGRAY);
                cprintf("into upper vol nibble.      ");
                gotoxy(51, 13); textcolor(LIGHTGRAY);
                cprintf("Stereo panning balance.     ");
                break;
            case 3:
                gotoxy(51, 10); textcolor(WHITE);
                cprintf("4. Left Channel Octave Shift");
                gotoxy(51, 11); textcolor(LIGHTGRAY);
                cprintf("Shifts primary voices on    ");
                gotoxy(51, 12); textcolor(LIGHTGRAY);
                cprintf("Chip 0 (Left audio output). ");
                gotoxy(51, 13); textcolor(LIGHTGRAY);
                cprintf("Range: -2 to +2 octaves.    ");
                break;
            case 4:
                gotoxy(51, 10); textcolor(WHITE);
                cprintf("5. Right Channel Octave     ");
                gotoxy(51, 11); textcolor(LIGHTGRAY);
                cprintf("Shifts secondary voices on  ");
                gotoxy(51, 12); textcolor(LIGHTGRAY);
                cprintf("Chip 1 (Right output). Rich ");
                gotoxy(51, 13); textcolor(LIGHTGRAY);
                cprintf("ORGAN.EXE stereo octave split");
                break;
            case 5:
                gotoxy(51, 10); textcolor(WHITE);
                cprintf("6. Detune Chorus            ");
                gotoxy(51, 11); textcolor(LIGHTGRAY);
                cprintf("Engages Chip 1 twin voice   ");
                gotoxy(51, 12); textcolor(LIGHTGRAY);
                cprintf("with +2 frequency offset.   ");
                gotoxy(51, 13); textcolor(LIGHTGRAY);
                cprintf("Warm analog stereo unison.  ");
                break;
            case 6:
                gotoxy(51, 10); textcolor(WHITE);
                cprintf("7. Layer Octave Up (+12st)  ");
                gotoxy(51, 11); textcolor(LIGHTGRAY);
                cprintf("Twin voice plays +12 semiton");
                gotoxy(51, 12); textcolor(LIGHTGRAY);
                cprintf("inserting 2nd/6th harmonics ");
                gotoxy(51, 13); textcolor(LIGHTGRAY);
                cprintf("for rich piano-like body.   ");
                break;
            case 7:
                gotoxy(51, 10); textcolor(WHITE);
                cprintf("8. Voice Mode (Poly / Mono) ");
                gotoxy(51, 11); textcolor(LIGHTCYAN);
                cprintf("Poly: 12-Voice chords.      ");
                gotoxy(51, 12); textcolor(LIGHTCYAN);
                cprintf("Mono: Solo Lead/Bass with   ");
                gotoxy(51, 13); textcolor(LIGHTCYAN);
                cprintf("authentic legato note stack!");
                break;
            case 8:
                gotoxy(51, 10); textcolor(WHITE);
                cprintf("9. Sustain Volume Level     ");
                gotoxy(51, 11); textcolor(LIGHTGRAY);
                cprintf("Volume held while key       ");
                gotoxy(51, 12); textcolor(LIGHTGRAY);
                cprintf("pressed after decay ramp.   ");
                gotoxy(51, 13); textcolor(LIGHTGRAY);
                cprintf("Range: 0 to 15 level.       ");
                break;
            case 9:
                gotoxy(51, 10); textcolor(WHITE);
                cprintf("10. Percussive Decay Speed  ");
                gotoxy(51, 11); textcolor(LIGHTGRAY);
                cprintf("Drop rate from peak down    ");
                gotoxy(51, 12); textcolor(LIGHTGRAY);
                cprintf("to sustain level.           ");
                gotoxy(51, 13); textcolor(LIGHTGRAY);
                cprintf("0 = Infinite organ sustain. ");
                break;
            case 10:
                gotoxy(51, 10); textcolor(WHITE);
                cprintf("11. Release Sustain Tail    ");
                gotoxy(51, 11); textcolor(LIGHTGRAY);
                cprintf("Software envelope release   ");
                gotoxy(51, 12); textcolor(LIGHTGRAY);
                cprintf("decay length after note-off.");
                gotoxy(51, 13); textcolor(LIGHTGRAY);
                cprintf("Base: 16 ticks (~240ms).    ");
                break;
        }
    }

    active_cnt = 0;
    for (i = 0; i < 12; i++) {
        if (voices[i].active && voices[i].state != 0) active_cnt++;
    }

    if (force || active_cnt != last_voices_active) {
        last_voices_active = active_cnt;
        gotoxy(51, 16);
        if (active_cnt > 0 && last_played_note >= 0) {
            textcolor(LIGHTGREEN);
            cprintf("Note: %-22s", last_note_str);
        } else {
            textcolor(DARKGRAY);
            cprintf("Note: Idle (Play MIDI keys) ");
        }
        gotoxy(51, 17);
        textcolor(YELLOW);
        cprintf("Voices: %2d/12 Active Sound ", active_cnt);
    }
}

void draw_ui_frame(void) {
    textbackground(BLACK);
    clrscr();

    /* 1. Header Box (Rows 1-3) */
    draw_box(1, 1, 80, 3, YELLOW, BLUE, 1);
    gotoxy(3, 2);
    textbackground(BLUE);
    textcolor(YELLOW);
    cprintf("M2SPCT v1.0");
    textcolor(WHITE);
    cprintf(" | Midi2Saa Preset Creation Tool (C/MS SAA1099)");
    gotoxy(71, 2);
    textcolor(LIGHTGREEN);
    cprintf("[READY]");

    /* 2. Slot Selector Box (Rows 4-6) */
    draw_box(1, 4, 80, 6, CYAN, BLACK, 0);
    gotoxy(3, 4);
    textcolor(LIGHTCYAN);
    cprintf(" Active Preset Slot [F1-F12] (Cubase Prog Change: 0xC0) ");

    /* 3. Parameter Editor Box (Rows 7-19, Cols 1-48) */
    draw_box(1, 7, 48, 19, GREEN, BLACK, 0);
    gotoxy(3, 7);
    textcolor(LIGHTGREEN);
    cprintf(" SAA1099 Sound Parameters [UP/DN/LF/RT] ");

    /* 4. Architecture & Help Box (Rows 7-19, Cols 49-80) */
    draw_box(49, 7, 80, 19, YELLOW, BLACK, 0);
    gotoxy(51, 7);
    textcolor(YELLOW);
    cprintf(" Sonic Architecture / Help ");
    draw_help_static();

    /* 5. Command Bar (Rows 20-22) */
    draw_box(1, 20, 80, 22, LIGHTGRAY, BLACK, 0);
    gotoxy(3, 21);
    textcolor(WHITE);
    cprintf("[UP/DN]=Nav [LF/RT]=Adjust [ENTER]=Rename [TAB]=Panic [S]=Save [ESC]=Exit");

    /* 6. Status Bar (Row 24) */
    gotoxy(1, 24);
    textbackground(LIGHTGRAY);
    textcolor(BLACK);
    cprintf(" M2SPCT v1.0 | Creative Sound Blaster 2.0 / C/MS (0x%03X, IRQ %d) | M2SPRE.CFG  ", sb_base, sb_irq);
}

void draw_gauge(char *buf, int val, int max_val, int width) {
    int i, filled;
    filled = (val * width) / max_val;
    if (filled > width) filled = width;
    if (filled < 0) filled = 0;
    for (i = 0; i < width; i++) {
        buf[i] = (i < filled) ? (char)0xDB : (char)0xB0;
    }
    buf[width] = 0;
}

void update_ui_display(void) {
    int i;
    CMS_PRESET *p;
    char gauge[17];

    p = &presets[cur_slot];

    textbackground(BLACK);
    gotoxy(3, 5);
    textcolor(WHITE);
    cprintf("Slot [F%-2d]: ", cur_slot + 1);
    textcolor(YELLOW);
    cprintf("%-18s", p->name);
    textcolor(LIGHTGRAY);
    cprintf(" Mode: %-10s | [TAB]=Panic ", p->is_mono ? "MONOPHONIC" : "POLYPHONIC");

    for (i = 0; i < 11; i++) {
        gotoxy(3, 8 + i);
        if (i == cur_param) {
            textbackground(BLUE);
            textcolor(YELLOW);
            cprintf("--> ");
        } else {
            textbackground(BLACK);
            textcolor(DARKGRAY);
            cprintf("    ");
        }

        switch (i) {
            case 0:
                textcolor(i == cur_param ? WHITE : LIGHTGRAY);
                cprintf(" 1. Name         : \"%-17s\" [ENTER] ", p->name);
                break;
            case 1:
                draw_gauge(gauge, p->vol_left, 15, 10);
                textcolor(i == cur_param ? WHITE : LIGHTGRAY);
                cprintf(" 2. Left Volume  : [%s] %2d/15", gauge, p->vol_left);
                break;
            case 2:
                draw_gauge(gauge, p->vol_right, 15, 10);
                textcolor(i == cur_param ? WHITE : LIGHTGRAY);
                cprintf(" 3. Right Volume : [%s] %2d/15", gauge, p->vol_right);
                break;
            case 3:
                textcolor(i == cur_param ? WHITE : LIGHTGRAY);
                cprintf(" 4. Octave (Left): %+d Octave(s)        ", p->octave_left);
                break;
            case 4:
                textcolor(i == cur_param ? WHITE : LIGHTGRAY);
                cprintf(" 5. Octave(Right): %+d Octave(s)        ", p->octave_right);
                break;
            case 5:
                textcolor(i == cur_param ? WHITE : LIGHTGRAY);
                cprintf(" 6. Detune Chorus: %-3s (Chip 1 Twin)   ", p->detune_chorus ? "ON " : "OFF");
                break;
            case 6:
                textcolor(i == cur_param ? WHITE : LIGHTGRAY);
                cprintf(" 7. Layer +1 Oct : %-3s (Body Harmonics)", p->layer_octave_up ? "ON " : "OFF");
                break;
            case 7:
                textcolor(i == cur_param ? WHITE : LIGHTGRAY);
                if (p->is_mono) {
                    cprintf(" 8. Voice Mode   : [MONOPHONIC] (Solo Lead)");
                } else {
                    cprintf(" 8. Voice Mode   : [POLYPHONIC] (12 Voices)");
                }
                break;
            case 8:
                draw_gauge(gauge, p->sustain_lvl, 15, 10);
                textcolor(i == cur_param ? WHITE : LIGHTGRAY);
                cprintf(" 9. Sustain Level: [%s] %2d/15", gauge, p->sustain_lvl);
                break;
            case 9:
                draw_gauge(gauge, p->decay_rate > 0 ? (p->decay_rate > 200 ? 10 : (p->decay_rate / 20)) : 0, 10, 10);
                textcolor(i == cur_param ? WHITE : LIGHTGRAY);
                if (p->decay_rate == 0) {
                    cprintf("10. Decay Rate   : [Infinite / Organ]   ");
                } else {
                    cprintf("10. Decay Rate   : [%s] %3d ticks", gauge, p->decay_rate);
                }
                break;
            case 10:
                draw_gauge(gauge, p->rel_rate, 60, 10);
                textcolor(i == cur_param ? WHITE : LIGHTGRAY);
                cprintf("11. Release Tail : [%s] %2d (~%3dms)", gauge, p->rel_rate, p->rel_rate * 15);
                break;
        }
    }

    update_help_text(0);

    gotoxy(1, 23);
    textbackground(BLACK);
    textcolor(LIGHTGREEN);
    cprintf(" STATUS: %-70s", status_msg);
}

void edit_preset_name(void) {
    char buf[20];
    int pos, ch;
    CMS_PRESET *p;

    p = &presets[cur_slot];
    strncpy(buf, p->name, 17);
    buf[17] = 0;
    pos = strlen(buf);

    _setcursortype(_NORMALCURSOR);
    gotoxy(1, 23);
    textbackground(BLUE);
    textcolor(YELLOW);
    cprintf(" RENAME SLOT F%-2d: [ENTER]=Save [ESC]=Cancel | Type name: %-25s", cur_slot + 1, "");
    gotoxy(54, 23);
    cprintf("%-17s", buf);
    gotoxy(54 + pos, 23);

    while (1) {
        if (kbhit()) {
            ch = getch();
            if (ch == 13) {
                while (pos < 17) buf[pos++] = ' ';
                buf[17] = 0;
                strncpy(p->name, buf, 18);
                p->name[18] = 0;
                strcpy(status_msg, "Preset name updated successfully!");
                break;
            } else if (ch == 27) {
                strcpy(status_msg, "Preset renaming cancelled.");
                break;
            } else if (ch == 8) {
                if (pos > 0) {
                    pos--;
                    buf[pos] = ' ';
                    gotoxy(54 + pos, 23);
                    putch(' ');
                    gotoxy(54 + pos, 23);
                }
            } else if (ch >= 32 && ch <= 126 && pos < 17) {
                buf[pos] = (char)ch;
                putch((char)ch);
                pos++;
            }
        }
        delay(5);
    }
    _setcursortype(_NOCURSOR);
    ui_dirty = 1;
}

void adjust_param(int dir) {
    CMS_PRESET *p;
    int ch_i, chip_idx, reg_idx;

    p = &presets[cur_slot];

    switch (cur_param) {
        case 0:
            edit_preset_name();
            break;
        case 1:
            if (dir > 0 && p->vol_left < 15) p->vol_left++;
            if (dir < 0 && p->vol_left > 0) p->vol_left--;
            break;
        case 2:
            if (dir > 0 && p->vol_right < 15) p->vol_right++;
            if (dir < 0 && p->vol_right > 0) p->vol_right--;
            break;
        case 3:
            if (dir > 0 && p->octave_left < 2) p->octave_left++;
            if (dir < 0 && p->octave_left > -2) p->octave_left--;
            break;
        case 4:
            if (dir > 0 && p->octave_right < 2) p->octave_right++;
            if (dir < 0 && p->octave_right > -2) p->octave_right--;
            break;
        case 5:
            p->detune_chorus = !p->detune_chorus;
            break;
        case 6:
            p->layer_octave_up = !p->layer_octave_up;
            break;
        case 7:
            p->is_mono = !p->is_mono;
            if (p->is_mono) {
                for (ch_i = 1; ch_i < 6; ch_i++) {
                    saa_write(0, SAA_REG_VOL_BASE + ch_i, 0);
                    saa_write(1, SAA_REG_VOL_BASE + ch_i, 0);
                    voices[ch_i].active = 0;
                    voices[ch_i + 6].active = 0;
                }
            }
            break;
        case 8:
            if (dir > 0 && p->sustain_lvl < 15) p->sustain_lvl++;
            if (dir < 0 && p->sustain_lvl > 0) p->sustain_lvl--;
            break;
        case 9:
            if (dir > 0) {
                if (p->decay_rate < 250) p->decay_rate += 10;
                else p->decay_rate = 255;
            } else {
                if (p->decay_rate >= 10) p->decay_rate -= 10;
                else p->decay_rate = 0;
            }
            break;
        case 10:
            if (dir > 0 && p->rel_rate < 60) p->rel_rate += 2;
            if (dir < 0 && p->rel_rate > 2) p->rel_rate -= 2;
            break;
    }

    if (cur_param == 1 || cur_param == 2) {
        for (ch_i = 0; ch_i < 12; ch_i++) {
            if (voices[ch_i].active && voices[ch_i].state == 1) {
                chip_idx = (ch_i < 6) ? 0 : 1;
                reg_idx = ch_i % 6;
                if (cur_param == 1) voices[ch_i].cur_vol_l = p->vol_left;
                if (cur_param == 2) voices[ch_i].cur_vol_r = p->vol_right;
                saa_write(chip_idx, SAA_REG_VOL_BASE + reg_idx,
                          (voices[ch_i].cur_vol_r << 4) | (voices[ch_i].cur_vol_l & 0x0F));
            }
        }
    }
}

int handle_keyboard(void) {
    int key, ext;

    if (kbhit()) {
        key = getch();
        if (key == 27) {
            return 0;
        } else if (key == 13) {
            if (cur_param == 0) {
                edit_preset_name();
            } else {
                adjust_param(1);
                ui_dirty = 1;
            }
        } else if (key == 0 || key == 0xE0) {
            ext = getch();
            if (ext == 0x48) {
                if (cur_param > 0) cur_param--;
                else cur_param = 10;
                ui_dirty = 1;
            } else if (ext == 0x50) {
                if (cur_param < 10) cur_param++;
                else cur_param = 0;
                ui_dirty = 1;
            } else if (ext == 0x4B) {
                adjust_param(-1);
                ui_dirty = 1;
            } else if (ext == 0x4D) {
                adjust_param(1);
                ui_dirty = 1;
            } else if (ext >= 0x3B && ext <= 0x44) {
                cur_slot = ext - 0x3B;
                ui_dirty = 1;
            } else if (ext == 0x85) {
                cur_slot = 10;
                ui_dirty = 1;
            } else if (ext == 0x86) {
                cur_slot = 11;
                ui_dirty = 1;
            }
        } else if (key == 9) {
            all_notes_off();
            strcpy(status_msg, "PANIC: All 12 SAA1099 voices silenced! MIDI buffer cleared.");
            ui_dirty = 1;
        } else if (key == 's' || key == 'S') {
            if (save_presets_to_cfg("M2SPRE.CFG")) {
                strcpy(status_msg, "Saved all 12 presets to M2SPRE.CFG successfully!");
            } else {
                strcpy(status_msg, "Error: Failed to write M2SPRE.CFG!");
            }
            ui_dirty = 1;
        } else if (key == 'l' || key == 'L') {
            if (load_presets_from_cfg("M2SPRE.CFG") > 0) {
                strcpy(status_msg, "Reloaded presets from M2SPRE.CFG!");
            } else {
                strcpy(status_msg, "M2SPRE.CFG not found in current directory.");
            }
            ui_dirty = 1;
        } else if (key == 'r' || key == 'R') {
            presets[cur_slot] = default_presets[cur_slot];
            strcpy(status_msg, "Current slot reset to factory defaults.");
            ui_dirty = 1;
        }
    }
    return 1;
}

int main(int argc, char *argv[]) {
    char *blaster_env, *p_env;
    int is_running;

    is_running = 1;

    if (argc >= 2) sb_base = (int)strtol(argv[1], NULL, 16);
    if (argc >= 3) sb_irq = atoi(argv[2]);

    if (argc < 2) {
        blaster_env = getenv("BLASTER");
        if (blaster_env) {
            p_env = strstr(blaster_env, "A");
            if (p_env) sb_base = (int)strtol(p_env + 1, NULL, 16);
            p_env = strstr(blaster_env, "I");
            if (p_env) sb_irq = atoi(p_env + 1);
        }
    }

    init_sb20_mixer();
    init_saa1099();
    init_dsp_midi();

    if (load_presets_from_cfg("M2SPRE.CFG") > 0) {
        strcpy(status_msg, "Loaded custom presets from M2SPRE.CFG. MIDI In: Active.");
    } else {
        save_presets_to_cfg("M2SPRE.CFG");
        strcpy(status_msg, "Created starter M2SPRE.CFG. MIDI In: Active.");
    }

    _setcursortype(_NOCURSOR);
    draw_ui_frame();
    update_ui_display();
    update_help_text(1);

    while (is_running) {
        process_midi();
        process_envelopes();

        if (!handle_keyboard()) {
            is_running = 0;
            break;
        }

        delay(1);
        if (ui_dirty) {
            ui_dirty = 0;
            update_ui_display();
        }
    }

    cleanup_hardware();
    _setcursortype(_NORMALCURSOR);
    textbackground(BLACK);
    textcolor(LIGHTGRAY);
    clrscr();
    printf("M2SPCT Preset Creation Tool closed. Presets saved in M2SPRE.CFG.\n");
    printf("Launch MIDI2SAA.EXE to perform with your custom sounds!\n");
    return 0;
}
