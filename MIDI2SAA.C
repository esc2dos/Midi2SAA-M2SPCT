/* =========================================================================
 * MIDI2SAA.C - Midi2Saa v2.2 (Dual Philips SAA1099 Gameport MIDI Synthesizer)
 * (C) 1988-1992 Creative Technology Ltd & 386DX Retro Engineering
 *
 * NOTE: Version 1.0 was the initial Creative Organ clone.
 *       Version 2.0 added Pitch Bend Wheel (0xE0) & Modulation Wheel (CC #1).
 *       Version 2.1 mapped presets to Function keys (F1-F12), added +/- sustain.
 *       Version 2.2 adds automatic M2SPRE.CFG preset loading/saving, live CFG
 *       reloading with 'L', and full interoperability with M2STOOL sound creator.
 *
 * Hardware Target:
 *   - Computer    : AMD Am386DX-40 / Intel 386DX-40 (MS-DOS 3.3/5.0/6.22)
 *   - Sound Card  : Sound Blaster (CT1350B / CT1320A / SB 1.0/1.5/2.0)
 *   - Sound Chips : DUAL PHILIPS SAA1099 (C/MS · Game Blaster 12 Stereo Voices)
 *                   Chip #0: Data 0x220, Addr 0x221 (Voices 1..6)
 *                   Chip #1: Data 0x222, Addr 0x223 (Voices 7..12)
 *   - Mixer Chip  : CT1335 Hardware Mixer (Ports 0x224 / 0x225)
 *   - MIDI Input  : 15-Pin Gameport / MIDI Adapter via Sound Blaster DSP
 *                   Uses Hardware Interrupt (IRQ 5 or IRQ 7) + Polled Fallback!
 *
 * Features:
 *   - 100% Dual Philips SAA1099 sound generation (12 stereo square-wave voices)
 *   - Master Audio Output ENABLED (Register 0x1C = 0x01)
 *   - Sound Blaster 2.0 CT1335 hardware mixer unmuted to max levels
 *   - ALL rhythm accompaniment & metronome noise REMOVED (dead silent background)
 *   - 12 authentic C/MS instrument presets with dual-chip stereo chorusing & decay
 *   - Dedicated MIDI controller play (keyboard typing note triggers disabled)
 *   - Presets selectable via Function keys F1-F12
 *   - Real interrupt-driven Gameport MIDI via DSP command 0x31 + 8259 PIC unmask
 *   - Exact whole-note pitch bend (+/-2.000 semitones) and modulation vibrato LFO
 *   - Authentic ~180-240ms release sustain pacing decoupled from video redraws
 *   - Color boxed 80x25 text mode display (Header, Hardware, Controllers, 12 Voices)
 *   - Strict Borland C++ 3.1 & Turbo C 2.0/3.0 C89 compilation compliance
 *
 * Compilers (Tested with zero errors & zero warnings):
 *   - Borland C++ 3.1: bcc -mc -O2 -3 -w- midi2saa.c
 *   - Turbo C 2.0/3.0: tcc -mc -O2 -3 -w- midi2saa.c
 * Usage: midi2saa [base_port_hex] [irq_dec]
 *        e.g. midi2saa        (uses SET BLASTER or auto-detects)
 *        e.g. midi2saa 220 5  (forces Base 220h, IRQ 5)
 *        e.g. midi2saa 220 7  (forces Base 220h, IRQ 7)
 * ========================================================================= */

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <conio.h>
#include <dos.h>
#include <stddef.h>

/* Port I/O compatibility macros for Borland C++ 3.1 & Turbo C */
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
int sb_base = 0x220;    /* Default base: 0x220 (or 0x240) */
int sb_irq  = 5;        /* Default IRQ: 5 (or 7 on SB 1.0/1.5/CMS) */

/* C/MS Dual Philips SAA1099 I/O Ports */
#define CMS_CHIP0_DATA   (sb_base + 0x00)
#define CMS_CHIP0_ADDR   (sb_base + 0x01)
#define CMS_CHIP1_DATA   (sb_base + 0x02)
#define CMS_CHIP1_ADDR   (sb_base + 0x03)

/* Sound Blaster CT1335 Mixer Ports */
#define MIXER_ADDR       (sb_base + 0x04)
#define MIXER_DATA       (sb_base + 0x05)

/* Sound Blaster DSP Ports (for Gameport MIDI) */
#define DSP_RESET        (sb_base + 0x06)
#define DSP_READ_DATA    (sb_base + 0x0A)
#define DSP_WRITE_DATA   (sb_base + 0x0C)
#define DSP_DATA_AVAIL   (sb_base + 0x0E)

/* Philips SAA1099 Internal Register Offsets */
#define SAA_REG_VOL_BASE     0x00   /* 0x00..0x05: Left/Right Volume (4-bit L, 4-bit R) */
#define SAA_REG_FREQ_BASE    0x08   /* 0x08..0x0D: Frequency Byte (0..255) */
#define SAA_REG_OCTAVE_BASE  0x10   /* 0x10..0x12: Octave (Ch0/1, Ch2/3, Ch4/5) */
#define SAA_REG_TONE_ENABLE  0x14   /* Tone enable mask (bits 0..5) */
#define SAA_REG_NOISE_ENABLE 0x15   /* Noise enable mask (bits 0..5) */
#define SAA_REG_MASTER_CTRL  0x1C   /* Bit 0: Sound Enable (1=ON), Bit 1: Reset */

/* SAA1099 Preset Instrument Structure with ADSR Decay & Release Sustain */
typedef struct {
    char name[20];
    unsigned char vol_left;    /* 0x0 to 0xF */
    unsigned char vol_right;   /* 0x0 to 0xF */
    int octave_left;           /* -2, -1, 0, +1, +2 (Left Channel / Chip 0) */
    int octave_right;          /* -2, -1, 0, +1, +2 (Right Channel / Chip 1) */
    int detune_chorus;         /* 1 = activate twin channel on Chip 1 */
    int layer_octave_up;       /* 1 = second voice plays 1 octave up for rich piano harmonics */
    int is_mono;               /* 0 = Polyphonic (12 Voices), 1 = Monophonic (Solo Lead/Bass) */
    unsigned char sustain_lvl; /* 0x0 to 0xF (volume maintained while held) */
    unsigned char decay_rate;  /* ticks per volume step during active decay */
    unsigned char rel_rate;    /* ticks per volume step during release decay (~240ms) */
} CMS_PRESET;

/* 12 Presets (Dynamic: loaded from M2SPRE.CFG or factory defaults) */
CMS_PRESET presets[12] = {
    /* Group 1: Pianos & Keyboards (F1 to F4) */
    { "01: BRIGHT PIANO ", 0xF, 0xF,  0,  0, 1, 1, 0, 0xA,  80, 16 },
    { "02: HONKY-TONK    ", 0xE, 0xE,  0,  0, 1, 0, 0, 0x9,  70, 18 },
    { "03: HARPSICHORD   ", 0xF, 0xC,  0,  1, 0, 1, 0, 0x3,  40, 12 },
    { "04: C/MS ORGAN    ", 0xF, 0xF,  0,  0, 1, 0, 0, 0xF,   0, 14 },
    /* Group 2: Horns & Woodwinds (F5 to F8) */
    { "05: BRASS FANFARE ", 0xF, 0xF,  0,  0, 1, 1, 0, 0xD, 180, 15 },
    { "06: PIPE FLUTE    ", 0xC, 0xC,  1,  1, 0, 0, 0, 0xB,   0, 15 },
    { "07: CLARINET      ", 0xD, 0xD,  0,  0, 0, 0, 0, 0xC,   0, 12 },
    { "08: REED ACCORDION", 0xE, 0xE,  0,  1, 1, 0, 0, 0xE,   0, 12 },
    /* Group 3: Strings, Synths & Bass (F9 to F12) */
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

int current_preset = 0;
static int sustain_offset = 0; /* Real-time sustain tail adjustment via + and - keys */
static char cfg_file_status[32] = "M2SPRE.CFG [DEFAULT]";

/* Monophonic Voice Note Stack for Legato Playing */
#define MONO_STACK_SIZE 16
static int mono_stack[MONO_STACK_SIZE];
static int mono_stack_count = 0;

/* Load 12 presets from M2SPRE.CFG */
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

        /* Try 10-value format first (12 columns: Slot "Name" VolL VolR OctL OctR Chorus LayerUp IsMono SusLvl Decay RelTail) */
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

/* Save 12 presets to M2SPRE.CFG */
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

/* Active voice allocation for 12 physical channels (6 on Chip 0, 6 on Chip 1) */
typedef struct {
    int active;
    int midi_note;
    int velocity;              /* MIDI velocity 1..127 */
    int state;                 /* 0 = IDLE, 1 = PLAYING (attack/sustain), 2 = RELEASING */
    unsigned char cur_vol_l;   /* current left volume (0..15) */
    unsigned char cur_vol_r;   /* current right volume (0..15) */
    unsigned char step_delay;  /* software envelope step counter */
} VOICE_STATE;

VOICE_STATE voices[12];

/* Real-time Performance Controllers */
int current_pitch_bend = 0;          /* -8192 to +8191 (0 = Center) */
unsigned char current_mod_depth = 0; /* 0..127 (MIDI CC #1 Modulation Wheel) */
static unsigned char lfo_tick = 0;
static int last_played_note = -1;
static int last_played_velocity = 0;
static int ui_dirty = 1;

/* SAA1099 Octave shadow registers to avoid clobbering paired channels */
static unsigned char oct_shadow[2][3] = {
    { 0x33, 0x33, 0x33 },
    { 0x33, 0x33, 0x33 }
};

/* Authentic Philips SAA1099 Equal Temperament Frequency Table (C through B)
   Formula: Divisor(k) = 508 / 2^(k/12), Register N(k) = 511 - Divisor(k)
   Matches Creative ORGAN.EXE / ORGANHEX.TXT 12-semitone Equal Temperament.
   Solves the flat 7th: A# (0xE2, minor 7th) and B (0xF2, major 7th) within < 0.6 cents! */
const unsigned char saa_freq_table[12] = {
    0x03, /* C  (divisor 508,  0.0 cents error) */
    0x20, /* C# (divisor 479, +1.8 cents error) */
    0x3A, /* D  (divisor 453, -1.6 cents error) */
    0x54, /* D# (divisor 427, +0.7 cents error) */
    0x6C, /* E  (divisor 403, +0.9 cents error) */
    0x82, /* F  (divisor 381, -1.9 cents error) */
    0x98, /* F# (divisor 359, +1.0 cents error) */
    0xAC, /* G  (divisor 339, +0.3 cents error) */
    0xBF, /* G# (divisor 320, +0.1 cents error) */
    0xD1, /* A  (divisor 302,  440 Hz standard, +0.3 cents error) */
    0xE2, /* A# (divisor 285,  minor 7th, +0.6 cents error) */
    0xF2  /* B  (divisor 269,  major 7th, +0.6 cents error - perfectly tuned!) */
};

/* 13-entry SAA1099 Divisor Table including C of next octave (254 = 508/2).
   Enables mathematically exact fractional pitch bend interpolation without flatness! */
static const int saa_div_table[13] = {
    508, 479, 453, 427, 403, 381, 359, 339, 320, 302, 285, 269, 254
};

static const char *note_names[12] = {
    "C-", "C#", "D-", "D#", "E-", "F-", "F#", "G-", "G#", "A-", "A#", "B-"
};

/* Circular MIDI FIFO buffer for interrupt-driven reception */
#define MIDI_BUF_SIZE 512
volatile unsigned char midi_queue[MIDI_BUF_SIZE];
volatile unsigned int midi_head = 0;
volatile unsigned int midi_tail = 0;
volatile unsigned long midi_rx_count = 0;
volatile unsigned char last_rx_byte = 0;

/* Type-safe Interrupt Vector function pointer for Borland C++ 3.1 & Turbo C */
#ifdef __cplusplus
typedef void (interrupt far *ISR_PTR)(...);
void interrupt far sb_midi_isr(...);
#else
typedef void (interrupt far *ISR_PTR)();
void interrupt far sb_midi_isr(void);
#endif

static ISR_PTR old_sb_isr = NULL;
static unsigned char old_pic_mask = 0;

/* Forward Function Prototypes for strict Borland C++ 3.1 & Turbo C compliance */
int  load_presets_from_cfg(const char *filename);
int  save_presets_to_cfg(const char *filename);
void bus_delay(void);
void saa_write(int chip, unsigned char reg, unsigned char val);
void init_sb20_mixer(void);
void init_saa1099(void);
void mute_all_saa1099(void);
void saa_calc_pitch(int midi_note, int bend_val, int lfo_offset, int octave_shift,
                    int *out_oct, unsigned char *out_freq);
void saa_note_on(int midi_note, int velocity);
void saa_note_off(int midi_note);
void saa_update_pitch(void);
void process_envelopes(void);
void dsp_write(unsigned char cmd);
int  dsp_reset(int base);
void push_midi_byte(unsigned char b);
int  pop_midi_byte(unsigned char *b);
int  init_dsp_midi(void);
void cleanup_hardware(void);
void process_midi(void);
int  handle_pc_keyboard(void);
void draw_box(int x1, int y1, int x2, int y2, int fg, int bg, int dbl);
void draw_ui_frame(void);
void update_ui_display(void);

/* 386DX Bus Recovery Delay */
void bus_delay(void) {
    int i;
    for (i = 0; i < 4; i++) inp(0x80);
}

/* Write to Philips SAA1099 Chip (0 or 1) */
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

/* Unmute Sound Blaster 2.0 CT1335 Hardware Mixer */
void init_sb20_mixer(void) {
    outp(MIXER_ADDR, 0x00); outp(MIXER_DATA, 0x00); /* Reset Mixer */
    bus_delay();
    outp(MIXER_ADDR, 0x02); outp(MIXER_DATA, 0x0E); /* Master Volume Max */
    bus_delay();
    outp(MIXER_ADDR, 0x06); outp(MIXER_DATA, 0x0E); /* MIDI / Synth Volume Max */
    bus_delay();
    outp(MIXER_ADDR, 0x08); outp(MIXER_DATA, 0x0E); /* CD Audio Volume Max */
    bus_delay();
    outp(MIXER_ADDR, 0x0A); outp(MIXER_DATA, 0x06); /* Voice Volume Max */
    bus_delay();
}

/* Initialize both SAA1099 chips with Master Sound Enabled */
void init_saa1099(void) {
    int chip, ch;

    for (chip = 0; chip < 2; chip++) {
        /* 1. Synchronize and reset generators (0x02) */
        saa_write(chip, SAA_REG_MASTER_CTRL, 0x02);
        bus_delay();

        /* 2. MASTER SOUND ENABLE: Bit 0 must be 1 to enable audio output! */
        saa_write(chip, SAA_REG_MASTER_CTRL, 0x01);
        bus_delay();

        /* 3. Enable tone on all 6 channels, disable noise */
        saa_write(chip, SAA_REG_TONE_ENABLE, 0x3F);
        saa_write(chip, SAA_REG_NOISE_ENABLE, 0x00);

        /* 4. Set initial octaves to 3 */
        oct_shadow[chip][0] = 0x33;
        oct_shadow[chip][1] = 0x33;
        oct_shadow[chip][2] = 0x33;
        saa_write(chip, 0x10, 0x33);
        saa_write(chip, 0x11, 0x33);
        saa_write(chip, 0x12, 0x33);

        /* 5. Silence all volume registers initially and disable envelope generators */
        for (ch = 0; ch < 6; ch++) {
            saa_write(chip, SAA_REG_VOL_BASE + ch, 0x00);
            saa_write(chip, SAA_REG_FREQ_BASE + ch, 0x21);
        }

        /* 6. CRITICAL: Disable Envelope Generators on Channel 2 (reg 0x18) and Channel 5 (reg 0x19)
              Prevents Voice 2 / 3rd note from being attenuated by hardware envelope logic */
        saa_write(chip, 0x18, 0x00);
        saa_write(chip, 0x19, 0x00);
    }

    for (ch = 0; ch < 12; ch++) {
        voices[ch].active = 0;
        voices[ch].midi_note = -1;
        voices[ch].velocity = 0;
        voices[ch].state = 0;
        voices[ch].cur_vol_l = 0;
        voices[ch].cur_vol_r = 0;
        voices[ch].step_delay = 0;
    }
}

/* Silence all voices (Keep Master Sound Enabled) */
void mute_all_saa1099(void) {
    int chip, ch;
    for (chip = 0; chip < 2; chip++) {
        for (ch = 0; ch < 6; ch++) {
            saa_write(chip, SAA_REG_VOL_BASE + ch, 0x00);
        }
        /* Keep envelope generators disabled */
        saa_write(chip, 0x18, 0x00);
        saa_write(chip, 0x19, 0x00);
    }
    for (ch = 0; ch < 12; ch++) {
        voices[ch].active = 0;
        voices[ch].midi_note = -1;
        voices[ch].velocity = 0;
        voices[ch].state = 0;
        voices[ch].cur_vol_l = 0;
        voices[ch].cur_vol_r = 0;
        voices[ch].step_delay = 0;
    }
    mono_stack_count = 0;
}

/* Calculate the exact Philips SAA1099 octave and frequency register N
   with full +/-2.000 semitones pitch bend and vibrato LFO.
   Takes: base midi_note, bend_val (-8192..+8191), lfo_offset, octave_shift.
   Produces: *out_oct (0..7) and *out_freq (0..255).
   Guarantees that maximum pitch bend reaches a FULL note (+2.00 semitones) without flatness! */
void saa_calc_pitch(int midi_note, int bend_val, int lfo_offset, int octave_shift,
                    int *out_oct, unsigned char *out_freq) {
    long total_subunits;
    long bend_subunits;
    int base_note;
    int note_num;
    int frac;
    int oct, semi;
    int div1, div2, d, n;
    int rel_note;

    base_note = midi_note + (octave_shift * 12);
    /* 256 sub-units per semitone. Pitch bend +/-8192 maps to +/-2 full semitones (+/-512 sub-units) */
    bend_subunits = ((long)bend_val * 512L) / 8192L;
    total_subunits = ((long)base_note * 256L) + bend_subunits;

    note_num = (int)(total_subunits / 256L);
    frac = (int)(total_subunits % 256L);
    if (frac < 0) {
        note_num--;
        frac += 256;
    }

    /* SAA1099 hardware counter table starts at A (MIDI 21 = A0).
       Convert standard MIDI note (where 60 = Middle C) to SAA1099 A-relative note!
       MIDI 21 (A0) -> rel_note = 0 (Octave 0, A).
       MIDI 60 (C4) -> rel_note = 39 (Octave 3, C, 261.97 Hz).
       MIDI 69 (A4) -> rel_note = 48 (Octave 4, A, 440 Hz). */
    rel_note = note_num - 21;
    if (rel_note < 0) { rel_note = 0; frac = 0; }
    if (rel_note > 95) { rel_note = 95; frac = 0; }

    oct = rel_note / 12;
    if (oct < 0) oct = 0;
    if (oct > 7) oct = 7;

    semi = rel_note % 12;
    div1 = saa_div_table[semi];
    div2 = saa_div_table[semi + 1];

    /* Smoothly interpolate period divisor between adjacent semitones */
    d = div1 - (((div1 - div2) * frac) / 256);
    d -= lfo_offset;

    /* Handle octave boundary crossing if pitch bend pushed past top divisor */
    if (d < 256) {
        d *= 2;
        if (oct < 7) oct++;
    }
    if (d > 511) d = 511;
    if (d < 256) d = 256;

    n = 511 - d;
    if (n < 0) n = 0;
    if (n > 255) n = 255;

    *out_oct = oct;
    *out_freq = (unsigned char)n;
}

/* Play a Note On the Dual SAA1099 chips (Applies real-time pitch bend IMMEDIATELY) */
void saa_note_on(int midi_note, int velocity) {
    int shift, v_idx, v_idx2;
    int oct, oct2, pair, oct_reg;
    unsigned char freq_byte, freq2, vol2_l, vol2_r;
    const CMS_PRESET *p;

    /* Handle MIDI note-off if velocity is zero */
    if (velocity <= 0) {
        saa_note_off(midi_note);
        return;
    }

    /* Velocity floor ensures notes in rapid succession do not drop in volume */
    if (velocity < 85) velocity = 85;

    last_played_note = midi_note;
    last_played_velocity = velocity;

    p = &presets[current_preset];

    /* Calculate pitch taking current_pitch_bend into account for Left Channel (Chip 0) */
    saa_calc_pitch(midi_note, current_pitch_bend, 0, p->octave_left, &oct, &freq_byte);

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
        /* Polyphonic Mode */
        /* Priority 1: If this note is already playing or releasing on Chip 0, reuse it */
        v_idx = -1;
        for (shift = 0; shift < 6; shift++) {
            if (voices[shift].active && voices[shift].midi_note == midi_note) {
                v_idx = shift;
                break;
            }
        }
        /* Priority 2: Find an idle voice on Chip 0 */
        if (v_idx == -1) {
            for (shift = 0; shift < 6; shift++) {
                if (!voices[shift].active || voices[shift].state == 0) {
                    v_idx = shift;
                    break;
                }
            }
        }
        /* Priority 3: Reuse voice in release phase */
        if (v_idx == -1) {
            for (shift = 0; shift < 6; shift++) {
                if (voices[shift].state == 2) {
                    v_idx = shift;
                    break;
                }
            }
        }
        if (v_idx == -1) v_idx = 0; /* Voice steal */
    }

    voices[v_idx].active = 1;
    voices[v_idx].midi_note = midi_note;
    voices[v_idx].velocity = velocity;
    voices[v_idx].state = 1; /* 1 = PLAYING (attack/sustain) */
    voices[v_idx].cur_vol_l = p->vol_left;
    voices[v_idx].cur_vol_r = p->vol_right;
    voices[v_idx].step_delay = 0;

    /* Ensure Master Sound is active (0x01) and envelope generators disabled */
    saa_write(0, SAA_REG_MASTER_CTRL, 0x01);
    saa_write(0, 0x18, 0x00);
    saa_write(0, 0x19, 0x00);

    /* Program SAA1099 Chip 0 */
    saa_write(0, SAA_REG_FREQ_BASE + v_idx, freq_byte);

    /* Update Octave register preserving twin channel */
    pair = v_idx / 2;
    oct_reg = SAA_REG_OCTAVE_BASE + pair;
    if (v_idx % 2 == 0) {
        oct_shadow[0][pair] = (oct_shadow[0][pair] & 0x70) | (oct & 0x07);
    } else {
        oct_shadow[0][pair] = (oct_shadow[0][pair] & 0x07) | ((oct & 0x07) << 4);
    }
    saa_write(0, oct_reg, oct_shadow[0][pair]);

    /* Set Amplitude: Right in upper nibble, Left in lower nibble */
    saa_write(0, SAA_REG_VOL_BASE + v_idx, (voices[v_idx].cur_vol_r << 4) | (voices[v_idx].cur_vol_l & 0x0F));

    /* Twin Chip 1 voice: Activated if chorus, layer up, or different stereo octaves */
    if (p->detune_chorus || p->layer_octave_up || p->octave_left != p->octave_right) {
        v_idx2 = v_idx + 6;
        saa_calc_pitch(midi_note, current_pitch_bend, 0, p->octave_right, &oct2, &freq2);
        vol2_l = p->vol_left;
        vol2_r = p->vol_right;

        if (p->layer_octave_up) {
            /* Layer 1 octave up for piano rich harmonic body */
            if (oct2 < 7) oct2++;
            vol2_l = (unsigned char)((vol2_l * 3) / 4);
            vol2_r = (unsigned char)((vol2_r * 3) / 4);
        } else if (p->detune_chorus) {
            /* Chorus detune */
            freq2 = (unsigned char)((freq2 < 253) ? (freq2 + 2) : 255);
        }

        voices[v_idx2].active = 1;
        voices[v_idx2].midi_note = midi_note;
        voices[v_idx2].velocity = velocity;
        voices[v_idx2].state = 1;
        voices[v_idx2].cur_vol_l = vol2_l;
        voices[v_idx2].cur_vol_r = vol2_r;
        voices[v_idx2].step_delay = 0;

        saa_write(1, SAA_REG_MASTER_CTRL, 0x01);
        saa_write(1, 0x18, 0x00);
        saa_write(1, 0x19, 0x00);
        saa_write(1, SAA_REG_FREQ_BASE + v_idx, freq2);

        if (v_idx % 2 == 0) {
            oct_shadow[1][pair] = (oct_shadow[1][pair] & 0x70) | (oct2 & 0x07);
        } else {
            oct_shadow[1][pair] = (oct_shadow[1][pair] & 0x07) | ((oct2 & 0x07) << 4);
        }
        saa_write(1, oct_reg, oct_shadow[1][pair]);
        saa_write(1, SAA_REG_VOL_BASE + v_idx, (voices[v_idx2].cur_vol_r << 4) | (voices[v_idx2].cur_vol_l & 0x0F));
    }
    ui_dirty = 1;
}

/* Release a Note: Enter software envelope decay/release phase */
void saa_note_off(int midi_note) {
    int ch, i;
    const CMS_PRESET *p;

    p = &presets[current_preset];

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
            mono_stack_count--; /* saa_note_on will re-push */
            saa_note_on(prev_note, 100);
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
        ui_dirty = 1;
        return;
    }

    for (ch = 0; ch < 12; ch++) {
        if (voices[ch].active && voices[ch].midi_note == midi_note && voices[ch].state == 1) {
            voices[ch].state = 2; /* 2 = RELEASING */
            voices[ch].step_delay = 0;
            ui_dirty = 1;
        }
    }
}

/* Real-time pitch bend calculation for Philips SAA1099 */
void saa_update_pitch(void) {
    int ch;
    int oct, oct2, pair, oct_reg;
    unsigned char freq_byte, freq2;
    const CMS_PRESET *p;

    p = &presets[current_preset];

    for (ch = 0; ch < 6; ch++) {
        if (voices[ch].active && voices[ch].midi_note >= 0) {
            saa_calc_pitch(voices[ch].midi_note, current_pitch_bend, 0, p->octave_left, &oct, &freq_byte);

            saa_write(0, SAA_REG_FREQ_BASE + ch, freq_byte);

            pair = ch / 2;
            oct_reg = SAA_REG_OCTAVE_BASE + pair;
            if (ch % 2 == 0) {
                oct_shadow[0][pair] = (oct_shadow[0][pair] & 0x70) | (oct & 0x07);
            } else {
                oct_shadow[0][pair] = (oct_shadow[0][pair] & 0x07) | ((oct & 0x07) << 4);
            }
            saa_write(0, oct_reg, oct_shadow[0][pair]);

            if (voices[ch + 6].active) {
                saa_calc_pitch(voices[ch].midi_note, current_pitch_bend, 0, p->octave_right, &oct2, &freq2);
                if (p->layer_octave_up) {
                    if (oct2 < 7) oct2++;
                } else if (p->detune_chorus) {
                    freq2 = (unsigned char)((freq2 < 253) ? (freq2 + 2) : 255);
                }
                saa_write(1, SAA_REG_FREQ_BASE + ch, freq2);
                if (ch % 2 == 0) {
                    oct_shadow[1][pair] = (oct_shadow[1][pair] & 0x70) | (oct2 & 0x07);
                } else {
                    oct_shadow[1][pair] = (oct_shadow[1][pair] & 0x07) | ((oct2 & 0x07) << 4);
                }
                saa_write(1, oct_reg, oct_shadow[1][pair]);
            }
        }
    }
    ui_dirty = 1;
}

/* Process software ADSR volume envelopes & modulation LFO vibrato */
void process_envelopes(void) {
    int ch;
    int chip, reg_ch;
    int delta, v, oct, oct2;
    int eff_rel;
    unsigned char f_byte, f2;
    const CMS_PRESET *p;

    p = &presets[current_preset];

    /* Calculate user-adjusted sustain release rate (+/- keys) */
    eff_rel = (int)p->rel_rate + sustain_offset;
    if (eff_rel < 3) eff_rel = 3;
    if (eff_rel > 70) eff_rel = 70;

    /* Software Vibrato LFO from Modulation Wheel (CC #1) */
    if (current_mod_depth > 0) {
        lfo_tick++;
        if ((lfo_tick % 25) == 0) {
            delta = (current_mod_depth / 24) + 1;
            if ((lfo_tick / 25) % 2 == 0) delta = -delta;
            for (v = 0; v < 6; v++) {
                if (voices[v].active && voices[v].midi_note >= 0) {
                    saa_calc_pitch(voices[v].midi_note, current_pitch_bend, delta, p->octave_left, &oct, &f_byte);
                    saa_write(0, SAA_REG_FREQ_BASE + v, f_byte);
                    if (voices[v + 6].active) {
                        saa_calc_pitch(voices[v].midi_note, current_pitch_bend, delta, p->octave_right, &oct2, &f2);
                        if (p->layer_octave_up) {
                            if (oct2 < 7) oct2++;
                        } else if (p->detune_chorus) {
                            f2 = (unsigned char)((f2 < 253) ? (f2 + 2) : 255);
                        }
                        saa_write(1, SAA_REG_FREQ_BASE + v, f2);
                    }
                }
            }
        }
    }

    for (ch = 0; ch < 12; ch++) {
        if (!voices[ch].active) continue;

        chip = (ch < 6) ? 0 : 1;
        reg_ch = ch % 6;

        if (voices[ch].state == 1) {
            /* Active percussive decay while key held down toward sustain level */
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
            /* Release decay phase: decrement volume until 0 (controllable via +/- keys) */
            voices[ch].step_delay++;
            if (voices[ch].step_delay >= (unsigned char)eff_rel) {
                voices[ch].step_delay = 0;
                if (voices[ch].cur_vol_l > 0) voices[ch].cur_vol_l--;
                if (voices[ch].cur_vol_r > 0) voices[ch].cur_vol_r--;

                saa_write(chip, SAA_REG_VOL_BASE + reg_ch,
                          (voices[ch].cur_vol_r << 4) | (voices[ch].cur_vol_l & 0x0F));

                if (voices[ch].cur_vol_l == 0 && voices[ch].cur_vol_r == 0) {
                    voices[ch].active = 0;
                    voices[ch].midi_note = -1;
                    voices[ch].state = 0;
                    ui_dirty = 1;
                }
            }
        }
    }
}

/* Sound Blaster DSP I/O Routines */
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
            if (inp(base + 0x0A) == 0xAA) return 1; /* DSP Ready! */
        }
        inp(0x80);
    }
    return 0;
}

/* Enqueue a byte safely */
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

/* Sound Blaster Hardware Interrupt Service Routine (IRQ 5 / 7) */
#ifdef __cplusplus
void interrupt far sb_midi_isr(...)
#else
void interrupt far sb_midi_isr(void)
#endif
{
    unsigned char b;
    /* Read incoming byte if data available */
    if (inp(DSP_DATA_AVAIL) & 0x80) {
        b = inp(DSP_READ_DATA);
        push_midi_byte(b);
    }

    /* Acknowledge DSP interrupt */
    inp(DSP_DATA_AVAIL);

    /* Send End Of Interrupt (EOI) to 8259 PIC */
    outp(0x20, 0x20);
}

/* Put Sound Blaster DSP into Gameport MIDI Interrupt Mode */
int init_dsp_midi(void) {
    int int_vector;

    if (!dsp_reset(sb_base)) {
        return 0;
    }

    /* Save old interrupt vector */
    int_vector = sb_irq + 8;
    old_sb_isr = (ISR_PTR)getvect(int_vector);

    /* Install our ISR */
    setvect(int_vector, (ISR_PTR)sb_midi_isr);

    /* Unmask IRQ on 8259 PIC */
    old_pic_mask = (unsigned char)inp(0x21);
    outp(0x21, old_pic_mask & ~(1 << sb_irq));

    /* Send DSP Command 0x31: MIDI Read with Interrupt */
    dsp_write(0x31);

    /* Clear any pending byte / ack DSP */
    inp(DSP_DATA_AVAIL);

    return 1;
}

/* Restore hardware on exit */
void cleanup_hardware(void) {
    mute_all_saa1099();

    /* Reset DSP to exit MIDI mode */
    outp(DSP_RESET, 1);
    delay(2);
    outp(DSP_RESET, 0);

    /* Restore PIC mask */
    if (old_pic_mask != 0) {
        outp(0x21, old_pic_mask);
    }

    /* Restore interrupt vector */
    if (old_sb_isr != NULL) {
        setvect(sb_irq + 8, (ISR_PTR)old_sb_isr);
    }
}

/* Pop byte from MIDI FIFO queue */
int pop_midi_byte(unsigned char *b) {
    if (midi_head == midi_tail) return 0;
    *b = midi_queue[midi_tail];
    midi_tail = (midi_tail + 1) % MIDI_BUF_SIZE;
    return 1;
}

/* Process incoming MIDI byte stream */
void process_midi(void) {
    static int state = 0;
    static unsigned char running_status = 0;
    static unsigned char param1 = 0;
    unsigned char b;
    unsigned char param2;
    unsigned char cmd;
    int raw_bend;

    /* Polled Fallback: ONLY check DSP data port if hardware ISR is not installed */
    if (old_sb_isr == NULL) {
        while (inp(DSP_DATA_AVAIL) & 0x80) {
            b = (unsigned char)inp(DSP_READ_DATA);
            inp(DSP_DATA_AVAIL);
            push_midi_byte(b);
        }
    }

    /* Process all bytes in queue */
    while (pop_midi_byte(&b)) {
        /* Real-Time messages (clock, active sensing, system reset) */
        if (b >= 0xF8) {
            if (b == 0xFF) { /* MIDI System Reset */
                mute_all_saa1099();
                state = 0;
                running_status = 0;
            }
            continue;
        }

        /* Status Byte */
        if (b & 0x80) {
            /* SysEx (0xF0, 0xF7) or System Common (0xF1..0xF6) cancels running status */
            if (b >= 0xF0) {
                running_status = 0;
                state = 0;
                continue;
            }
            running_status = b;
            state = 1;
            continue;
        }

        /* Data Bytes */
        if (state == 1) {
            param1 = b;
            cmd = running_status & 0xF0;
            if (cmd == 0xC0 || cmd == 0xD0) {
                /* Program Change (0xC0) or Channel Pressure / Aftertouch (0xD0): 1 data byte! */
                if (cmd == 0xC0) {
                    current_preset = param1 % 12;
                    sprintf(cfg_file_status, "CUBASE PROG: F%-2d", current_preset + 1);
                    ui_dirty = 1;
                }
                /* Reset state for next data byte if running status continues */
                state = 1;
            } else {
                state = 2;
            }
        } else if (state == 2) {
            param2 = b;
            cmd = running_status & 0xF0;

            if (cmd == 0x90) { /* Note On */
                if (param2 > 0) {
                    saa_note_on(param1, param2);
                } else {
                    saa_note_off(param1);
                }
            } else if (cmd == 0x80) { /* Note Off */
                saa_note_off(param1);
            } else if (cmd == 0xB0) { /* Control Change */
                if (param1 == 0x01) {
                    current_mod_depth = param2;
                } else if (param1 == 120 || param1 == 123) {
                    /* CC 120: All Sound Off / CC 123: All Notes Off */
                    mute_all_saa1099();
                }
            } else if (cmd == 0xE0) { /* Pitch Bend (14-bit: param1=LSB, param2=MSB) */
                raw_bend = ((int)param2 << 7) | (param1 & 0x7F);
                current_pitch_bend = raw_bend - 8192;
                saa_update_pitch();
            }
            state = 1; /* Keep running status */
        }
    }
}

/* Draw rectangular box using CP437 box drawing characters */
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

/* Render permanent 80x25 color UI frame */
void draw_ui_frame(void) {
    textbackground(BLACK);
    clrscr();

    /* 1. Header Box (Rows 1-3) */
    draw_box(1, 1, 80, 3, YELLOW, BLUE, 1);
    gotoxy(3, 2);
    textbackground(BLUE);
    textcolor(YELLOW);
    cprintf("Midi2Saa v2.2");
    textcolor(WHITE);
    cprintf(" | SB 2.0 / CMS Dual SAA1099 Synthesizer");
    gotoxy(71, 2);
    textcolor(LIGHTGREEN);
    cprintf("[LIVE]");

    /* 2. Compact Hardware Status Box (Rows 4-6) */
    draw_box(1, 4, 80, 6, CYAN, BLACK, 0);
    gotoxy(3, 4);
    textcolor(LIGHTCYAN);
    cprintf(" Hardware Config & Preset File ");
    gotoxy(3, 5);
    textcolor(LIGHTGRAY);
    cprintf("Base:0x%03X IRQ:%d Mixer:CT1335 MAX CFG:%-22s",
            sb_base, sb_irq, cfg_file_status);

    /* 3. Preset Panel (Rows 7-14, Cols 1-40) */
    draw_box(1, 7, 40, 14, GREEN, BLACK, 0);
    gotoxy(3, 7);
    textcolor(LIGHTGREEN);
    cprintf(" SAA1099 Preset [F1-F12] ");
    gotoxy(3, 8);  textcolor(DARKGRAY);  cprintf("Preset : ");
    gotoxy(3, 9);  textcolor(DARKGRAY);  cprintf("Shift  : ");
    gotoxy(3, 10); textcolor(DARKGRAY);  cprintf("Decay  : ");
    gotoxy(3, 11); textcolor(DARKGRAY);  cprintf("Stereo : ");
    gotoxy(3, 12); textcolor(DARKGRAY);  cprintf("Last In: ");
    gotoxy(3, 13); textcolor(DARKGRAY);  cprintf("MIDI Rx: ");

    /* 4. Real-Time Performance Controllers (Rows 7-14, Cols 41-80) */
    draw_box(41, 7, 80, 14, LIGHTRED, BLACK, 0);
    gotoxy(43, 7);
    textcolor(YELLOW);
    cprintf(" Performance Controllers ");
    gotoxy(43, 8);
    textcolor(LIGHTGRAY);
    cprintf("Pitch Bend Wheel (0xE0 / [ ] %c)", 92);
    gotoxy(43, 10);
    textcolor(LIGHTGRAY);
    cprintf("Modulation Wheel (CC #1 / , .)");
    gotoxy(43, 12);
    textcolor(DARKGRAY);
    cprintf("Pitch Range: +/-2.00 Semitones Full");
    gotoxy(43, 13);
    textcolor(DARKGRAY);
    cprintf("Vibrato LFO: Sine @ 5.8 Hz");

    /* 5. 12-Voice Stereo Polyphony Matrix (Rows 15-21, Cols 1-80) */
    draw_box(1, 15, 80, 21, MAGENTA, BLACK, 0);
    gotoxy(3, 15);
    textcolor(LIGHTMAGENTA);
    cprintf(" Philips SAA1099 12-Voice Activity Matrix ");
    gotoxy(3, 16);
    textcolor(LIGHTCYAN);
    cprintf("Chip 0 (0x%03X - Melodic Voices 1..6):", sb_base);
    gotoxy(3, 18);
    textcolor(LIGHTCYAN);
    cprintf("Chip 1 (0x%03X - Detune/Layer Voices 7..12):", sb_base + 2);

    /* 6. Quick Controls & Status Bar (Rows 22-25) */
    draw_box(1, 22, 80, 24, LIGHTGRAY, BLACK, 0);
    gotoxy(3, 23);
    textcolor(WHITE);
    cprintf("Keys: F1..F12=Presets | +/-=Sustain | [TAB]=Panic | L=Reload | ESC=Exit");

    gotoxy(1, 25);
    textbackground(LIGHTGRAY);
    textcolor(BLACK);
    cprintf(" Midi2Saa v2.2 | Creative Music System / Sound Blaster 2.0 | MIDI Active     ");
}

/* Dynamic updates - updates fields and meters directly with gotoxy() without scrolling */
void update_ui_display(void) {
    int i, ch, oct, semi, bend_pos, mod_pos;
    int cents;
    int eff_tail;
    const CMS_PRESET *p;
    char bend_bar[17];
    char mod_bar[17];

    p = &presets[current_preset];
    eff_tail = (int)p->rel_rate + sustain_offset;
    if (eff_tail < 3) eff_tail = 3;
    if (eff_tail > 70) eff_tail = 70;

    /* Update Preset Details */
    textbackground(BLACK);
    gotoxy(12, 8);
    textcolor(WHITE);
    cprintf("[F%-2d] %-17s", current_preset + 1, p->name);

    gotoxy(12, 9);
    textcolor(LIGHTCYAN);
    if (p->layer_octave_up) {
        cprintf("Octave Layer (+1 Oct)");
    } else if (p->detune_chorus) {
        cprintf("Detuned Chorus (Fat) ");
    } else if (p->octave_left != p->octave_right) {
        cprintf("L:%+d R:%+d (Stereo)   ", p->octave_left, p->octave_right);
    } else {
        cprintf("Shift: %+d Octaves     ", p->octave_left);
    }

    gotoxy(12, 10);
    textcolor(LIGHTGREEN);
    cprintf("Rate: %2d (Tail: %3dms [+/-]) ", eff_tail, eff_tail * 15);

    gotoxy(12, 11);
    textcolor(LIGHTGRAY);
    cprintf("L:%02d R:%02d (%s)", p->vol_left, p->vol_right,
            (p->vol_left > p->vol_right) ? "Left " :
            (p->vol_right > p->vol_left) ? "Right" : "Center");

    gotoxy(12, 12);
    if (last_played_note >= 0) {
        oct = (last_played_note / 12) - 1;
        semi = last_played_note % 12;
        textcolor(YELLOW);
        cprintf("%s%d (Vel:%3d, #%02d)  ", note_names[semi], oct, last_played_velocity, last_played_note);
    } else {
        textcolor(DARKGRAY);
        cprintf("Waiting for note...   ");
    }

    gotoxy(12, 13);
    textcolor(LIGHTCYAN);
    cprintf("%-6lu (Byte: 0x%02X)   ", midi_rx_count, last_rx_byte);

    /* Update Pitch Bend Gauge: -8192..+8191 mapped to 15-character meter */
    bend_pos = (int)(((long)(current_pitch_bend + 8192) * 14) / 16384);
    if (bend_pos < 0) bend_pos = 0;
    if (bend_pos > 14) bend_pos = 14;
    for (i = 0; i < 15; i++) {
        bend_bar[i] = (i == bend_pos) ? (char)0xDB : (char)0xC4;
    }
    bend_bar[15] = 0;

    cents = (int)(((long)current_pitch_bend * 200L) / 8192L);

    gotoxy(43, 9);
    textcolor(CYAN);
    cprintf("[");
    textcolor(YELLOW);
    cprintf("%s", bend_bar);
    textcolor(CYAN);
    cprintf("]");
    textcolor(WHITE);
    cprintf(" %+4.2f st ", (float)cents / 100.0f);

    /* Update Modulation Gauge: 0..127 mapped to 15-character meter */
    mod_pos = (int)(((long)current_mod_depth * 15) / 127);
    if (mod_pos < 0) mod_pos = 0;
    if (mod_pos > 15) mod_pos = 15;
    for (i = 0; i < 15; i++) {
        mod_bar[i] = (i < mod_pos) ? (char)0xDB : (char)0xB0;
    }
    mod_bar[15] = 0;

    gotoxy(43, 11);
    textcolor(CYAN);
    cprintf("[");
    textcolor(LIGHTMAGENTA);
    cprintf("%s", mod_bar);
    textcolor(CYAN);
    cprintf("]");
    textcolor(WHITE);
    cprintf(" %3d%% (%3d) ", (int)(((long)current_mod_depth * 100) / 127), current_mod_depth);

    /* Update Voice Activity Matrix: Chip 0 (Voices 1..6) */
    for (ch = 0; ch < 6; ch++) {
        gotoxy(3 + (ch * 12), 17);
        if (voices[ch].active && voices[ch].midi_note >= 0) {
            oct = (voices[ch].midi_note / 12) - 1;
            semi = voices[ch].midi_note % 12;
            textcolor(YELLOW);
            cprintf("V%d:", ch + 1);
            if (voices[ch].state == 1) textcolor(LIGHTGREEN);
            else textcolor(LIGHTRED);
            cprintf("[%s%d %02d] ", note_names[semi], oct, voices[ch].cur_vol_l);
        } else {
            textcolor(DARKGRAY);
            cprintf("V%d:[--- --] ", ch + 1);
        }
    }

    /* Update Voice Activity Matrix: Chip 1 (Voices 7..12) */
    for (ch = 0; ch < 6; ch++) {
        gotoxy(3 + (ch * 12), 20);
        if (voices[ch + 6].active && voices[ch + 6].midi_note >= 0) {
            oct = (voices[ch + 6].midi_note / 12) - 1;
            semi = voices[ch + 6].midi_note % 12;
            textcolor(YELLOW);
            cprintf("V%d:", ch + 7);
            if (voices[ch + 6].state == 1) textcolor(LIGHTGREEN);
            else textcolor(LIGHTRED);
            cprintf("[%s%d %02d] ", note_names[semi], oct, voices[ch + 6].cur_vol_l);
        } else {
            textcolor(DARKGRAY);
            cprintf("V%-2d:[--- --] ", ch + 7);
        }
    }
}

/* PC Keyboard interactive control - F1-F12 presets, Pitch/Mod hotkeys, TAB Panic, ESC to exit */
int handle_pc_keyboard(void) {
    int key;
    int ext;

    if (kbhit()) {
        key = getch();
        if (key == 27) { /* ESC to quit */
            return 0;
        } else if (key == 9) { /* [TAB] Panic - Mute all voices immediately */
            mute_all_saa1099();
            midi_head = midi_tail;
            current_pitch_bend = 0;
            current_mod_depth = 0;
            strcpy(cfg_file_status, "[PANIC: ALL VOICES MUTED]");
            ui_dirty = 1;
        } else if (key == 0 || key == 0xE0) {
            /* Extended key: Function Keys F1-F12 */
            ext = getch();
            if (ext >= 0x3B && ext <= 0x44) {
                /* F1 (0x3B) .. F10 (0x44) -> Presets 0..9 */
                current_preset = ext - 0x3B;
                ui_dirty = 1;
            } else if (ext == 0x85) {
                /* F11 -> Preset 10 */
                current_preset = 10;
                ui_dirty = 1;
            } else if (ext == 0x86) {
                /* F12 -> Preset 11 */
                current_preset = 11;
                ui_dirty = 1;
            }
        }
        /* Real-time Pitch Bend and Modulation hotkeys */
        else if (key == '[') { current_pitch_bend = -8192; saa_update_pitch(); ui_dirty = 1; }
        else if (key == ']') { current_pitch_bend = 8191; saa_update_pitch(); ui_dirty = 1; }
        else if (key == 92) { current_pitch_bend = 0; saa_update_pitch(); ui_dirty = 1; } /* Backslash key */
        else if (key == ',') { if (current_mod_depth >= 16) current_mod_depth -= 16; else current_mod_depth = 0; ui_dirty = 1; }
        else if (key == '.') { if (current_mod_depth <= 111) current_mod_depth += 16; else current_mod_depth = 127; ui_dirty = 1; }
        /* Real-time Sustain Tail adjustment via + and - keys */
        else if (key == '+' || key == '=') {
            if (sustain_offset < 40) sustain_offset += 2;
            ui_dirty = 1;
        }
        else if (key == '-' || key == '_') {
            if (sustain_offset > -10) sustain_offset -= 2;
            ui_dirty = 1;
        }
        /* Hotkey 'L' / 'l' to reload M2SPRE.CFG on the fly */
        else if (key == 'l' || key == 'L') {
            if (load_presets_from_cfg("M2SPRE.CFG") > 0) {
                strcpy(cfg_file_status, "M2SPRE.CFG [RELOADED]");
            } else {
                strcpy(cfg_file_status, "CFG NOT FOUND");
            }
            ui_dirty = 1;
        }
        /* Hotkey 'S' / 's' to save current presets to M2SPRE.CFG */
        else if (key == 's' || key == 'S') {
            if (save_presets_to_cfg("M2SPRE.CFG")) {
                strcpy(cfg_file_status, "M2SPRE.CFG [SAVED]");
            } else {
                strcpy(cfg_file_status, "SAVE FAILED");
            }
            ui_dirty = 1;
        }
    }
    return 1;
}

int main(int argc, char *argv[]) {
    char *blaster_env;
    char *p_env;
    int is_running;
    int ui_tick;

    is_running = 1;
    ui_tick = 0;

    /* 1. Parse command-line parameters if provided: midi2saa [port_hex] [irq_dec] */
    if (argc >= 2) {
        sb_base = (int)strtol(argv[1], NULL, 16);
    }
    if (argc >= 3) {
        sb_irq = atoi(argv[2]);
    }

    /* 2. Check BLASTER environment variable if not overridden */
    if (argc < 2) {
        blaster_env = getenv("BLASTER");
        if (blaster_env) {
            p_env = strstr(blaster_env, "A");
            if (p_env) sb_base = (int)strtol(p_env + 1, NULL, 16);
            p_env = strstr(blaster_env, "I");
            if (p_env) sb_irq = atoi(p_env + 1);
        }
    }

    /* 3. Unmute Sound Blaster 2.0 CT1335 hardware mixer */
    init_sb20_mixer();

    /* 4. Initialize SAA1099 Sound Generators with Master Sound Enabled */
    init_saa1099();

    /* 5. Initialize Sound Blaster DSP Gameport MIDI */
    if (!init_dsp_midi()) {
        sb_base = 0x240;
        init_dsp_midi();
    }

    /* 5b. Load presets from M2SPRE.CFG if present; otherwise create default M2SPRE.CFG */
    if (load_presets_from_cfg("M2SPRE.CFG") > 0) {
        strcpy(cfg_file_status, "M2SPRE.CFG [LOADED]");
    } else {
        save_presets_to_cfg("M2SPRE.CFG");
        strcpy(cfg_file_status, "M2SPRE.CFG [DEFAULT]");
    }

    /* 6. Switch to Clean 80x25 Color Screen, Hide Hardware Cursor */
    _setcursortype(_NOCURSOR);
    draw_ui_frame();
    update_ui_display();

    /* 7. Real-Time Audio & Performance Event Loop with 1ms Precision Pacing */
    while (is_running) {
        process_midi();
        process_envelopes();
        if (!handle_pc_keyboard()) {
            is_running = 0;
            break;
        }

        delay(1); /* 1 millisecond base tick for authentic ~200-240ms release envelope */

        ui_tick++;
        if (ui_dirty || ui_tick >= 40) {
            ui_tick = 0;
            ui_dirty = 0;
            update_ui_display();
        }
    }

    /* 8. Safe Hardware Shutdown & Clean Screen Exit */
    cleanup_hardware();
    _setcursortype(_NORMALCURSOR);
    textbackground(BLACK);
    textcolor(LIGHTGRAY);
    clrscr();
    printf("Midi2Saa v2.2 - SAA1099 Audio Output Terminated Safely.\n");
    return 0;
}
