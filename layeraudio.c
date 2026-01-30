#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdbool.h>
#include <math.h>
#include <time.h>
#include <stdint.h>
#include <unistd.h>
#include <dirent.h>
#include <sys/stat.h>

// Audio processing constants
#define MAX_CHANNELS 64
#define MAX_SONGS 100
#define MAX_PAN_ENTRIES 4096
#define SAMPLE_RATE 44100
#define BYTES_PER_SAMPLE 2
#define MAX_BUFFER_SIZE (SAMPLE_RATE * 60 * 10) // 10 minutes max

// Structure for audio buffer
typedef struct {
    float *data;
    size_t length;
    int channels;
    int sample_rate;
} AudioBuffer;

// Structure for pan configuration
typedef struct {
    int index;
    float gain;
} PanEntry;

typedef struct {
    PanEntry *entries;
    int count;
} PanChannel;

// Structure for LayerAudio
typedef struct {
    bool running;
    int maxnum;
    int total_channels;
    int song_count;
    
    // Audio parameters
    float bass;
    float treble;
    float bass_freq;
    float treble_freq;
    float volume;
    float tempo;
    
    // Delta values
    float bass_dlt;
    float treble_dlt;
    float bass_freq_dlt;
    float treble_freq_dlt;
    float volume_dlt;
    float tempo_dlt;
    
    // AI parameters
    float ai_channels;
    float ai_bass;
    float ai_treble;
    float ai_bass_freq;
    float ai_treble_freq;
    float ai_volume;
    float ai_tempo;
    float ai_maxnum;
    
    // Configuration
    int crayzz;
    int audchnum;
    char extension[10];
    int bitrate;
    
    // Audio data
    AudioBuffer *songs[MAX_SONGS];
    AudioBuffer *audio_buffers[MAX_SONGS];
    int channels[MAX_SONGS];
    
    // Pan configuration
    char pan[MAX_PAN_ENTRIES][256];
    char panfull[4096];
    
    // Knowledge base
    struct {
        int channels;
        char pan[4096];
        float bass;
        float treble;
        float bass_freq;
        float treble_freq;
        float volume;
        float tempo;
        int maxnum;
    } knowledge_base[100];
    int knowledge_count;
    
    // Output
    char output_filename[256];
    AudioBuffer *output_buffer;
    size_t output_length;
    int output_channels;
    
    // Logging
    FILE *log_file;
    
} LayerAudio;

// Utility functions
int gt_rnd(int min, int max) {
    return min + rand() % (max - min + 1);
}

float gt_rnd_float(float min, float max) {
    return min + ((float)rand() / RAND_MAX) * (max - min);
}

// Initialize LayerAudio
void layer_audio_init(LayerAudio *la) {
    srand(time(NULL));
    
    la->running = false;
    la->maxnum = gt_rnd(1, 314);
    la->total_channels = 0;
    la->song_count = 0;
    
    // Initialize parameters
    la->bass = gt_rnd(0, 166);
    la->treble = gt_rnd(0, 66);
    la->bass_freq = gt_rnd(0, 1000);
    la->treble_freq = gt_rnd(666, 10000);
    la->volume = gt_rnd(10, 31415) / 420.0f;
    la->tempo = gt_rnd(1666, 42669);
    
    // Initialize deltas
    la->bass_dlt = 0;
    la->treble_dlt = 0;
    la->bass_freq_dlt = 0;
    la->treble_freq_dlt = 0;
    la->volume_dlt = 0;
    la->tempo_dlt = 0;
    
    // Initialize AI parameters
    la->ai_channels = 0;
    la->ai_bass = 0;
    la->ai_treble = 0;
    la->ai_bass_freq = 0;
    la->ai_treble_freq = 0;
    la->ai_volume = 0;
    la->ai_tempo = 0;
    la->ai_maxnum = 0;
    
    // Default configuration
    la->crayzz = 1;
    la->audchnum = 2; // Stereo by default
    strcpy(la->extension, "wav");
    la->bitrate = 320;
    
    // Initialize arrays
    for (int i = 0; i < MAX_SONGS; i++) {
        la->songs[i] = NULL;
        la->audio_buffers[i] = NULL;
        la->channels[i] = 0;
    }
    
    for (int i = 0; i < MAX_PAN_ENTRIES; i++) {
        strcpy(la->pan[i], "");
    }
    
    strcpy(la->panfull, "");
    
    // Initialize knowledge base
    la->knowledge_count = 0;
    
    // Initialize output
    strcpy(la->output_filename, "");
    la->output_buffer = NULL;
    la->output_length = 0;
    la->output_channels = 0;
    
    // Open log file
    la->log_file = fopen("layer_audio.log", "w");
    if (la->log_file) {
        fprintf(la->log_file, "LayerAudio initialized\n");
    }
}

// Logging function
void add_log(LayerAudio *la, const char *message, const char *type) {
    time_t now = time(NULL);
    struct tm *t = localtime(&now);
    
    printf("[%02d:%02d:%02d] %s: %s\n", 
           t->tm_hour, t->tm_min, t->tm_sec, type, message);
    
    if (la->log_file) {
        fprintf(la->log_file, "[%02d:%02d:%02d] %s: %s\n",
                t->tm_hour, t->tm_min, t->tm_sec, type, message);
        fflush(la->log_file);
    }
}

// Load WAV file (simplified)
AudioBuffer* load_wav_file(const char *filename) {
    FILE *file = fopen(filename, "rb");
    if (!file) {
        return NULL;
    }
    
    // Read WAV header (simplified)
    char header[44];
    fread(header, 1, 44, file);
    
    // Parse header
    int sample_rate = *(int*)(header + 24);
    int channels = *(short*)(header + 22);
    int bits_per_sample = *(short*)(header + 34);
    int data_size = *(int*)(header + 40);
    
    // Calculate samples
    int samples = data_size / (channels * bits_per_sample / 8);
    
    // Allocate buffer
    AudioBuffer *buffer = malloc(sizeof(AudioBuffer));
    buffer->length = samples;
    buffer->channels = channels;
    buffer->sample_rate = sample_rate;
    buffer->data = malloc(samples * channels * sizeof(float));
    
    // Read audio data (convert to float)
    if (bits_per_sample == 16) {
        int16_t *raw_data = malloc(data_size);
        fread(raw_data, 1, data_size, file);
        
        for (int i = 0; i < samples * channels; i++) {
            buffer->data[i] = raw_data[i] / 32768.0f;
        }
        
        free(raw_data);
    } else if (bits_per_sample == 8) {
        uint8_t *raw_data = malloc(data_size);
        fread(raw_data, 1, data_size, file);
        
        for (int i = 0; i < samples * channels; i++) {
            buffer->data[i] = (raw_data[i] - 128) / 128.0f;
        }
        
        free(raw_data);
    }
    
    fclose(file);
    return buffer;
}

// Count songs in directory
void count_songs(LayerAudio *la, const char *directory) {
    add_log(la, "STARTING THE SONG COUNT", "info");
    
    DIR *dir = opendir(directory);
    if (!dir) {
        add_log(la, "Cannot open directory", "error");
        return;
    }
    
    struct dirent *entry;
    la->song_count = 0;
    la->total_channels = 0;
    
    while ((entry = readdir(dir)) != NULL && la->song_count < MAX_SONGS) {
        if (strstr(entry->d_name, ".wav") || strstr(entry->d_name, ".mp3")) {
            char path[512];
            snprintf(path, sizeof(path), "%s/%s", directory, entry->d_name);
            
            AudioBuffer *buffer = load_wav_file(path);
            if (buffer) {
                la->audio_buffers[la->song_count] = buffer;
                la->channels[la->song_count] = buffer->channels;
                la->total_channels += buffer->channels;
                
                char log_msg[256];
                snprintf(log_msg, sizeof(log_msg), 
                        "Song %d: %s (%d channels)", 
                        la->song_count + 1, entry->d_name, buffer->channels);
                add_log(la, log_msg, "info");
                
                la->song_count++;
            }
        }
    }
    
    closedir(dir);
    
    add_log(la, "SONG COUNT DONE", "success");
    
    char log_msg[256];
    snprintf(log_msg, sizeof(log_msg), "Total Channels: %d", la->total_channels);
    add_log(la, log_msg, "info");
}

// Setup pan configuration
void setup_pans(LayerAudio *la) {
    add_log(la, "STARTING THE PAN SETUP", "info");
    
    // Initialize pan array
    for (int i = 0; i < 64 * la->maxnum; i++) {
        strcpy(la->pan[i], "");
    }
    
    // Generate pan configurations
    for (int i = 0; i < 64 * la->maxnum; i++) {
        int used_channels[64] = {0};
        char pan_str[256] = "";
        
        for (int j = 0; j < la->crayzz; j++) {
            int channel = gt_rnd(0, la->total_channels - 1);
            
            // Check if channel already used
            int duplicate = 0;
            for (int k = 0; k < j; k++) {
                if (used_channels[k] == channel) {
                    duplicate = 1;
                    break;
                }
            }
            
            if (!duplicate) {
                char channel_str[16];
                if (j == 0) {
                    snprintf(channel_str, sizeof(channel_str), "c%d", channel);
                } else {
                    const char *sign = gt_rnd(0, 1) ? "+" : "-";
                    snprintf(channel_str, sizeof(channel_str), "%sc%d", sign, channel);
                }
                
                strcat(pan_str, channel_str);
                used_channels[j] = channel;
            }
        }
        
        if (strlen(pan_str) == 0) {
            strcpy(pan_str, "c0");
        }
        
        strcpy(la->pan[i], pan_str);
    }
    
    // Build panfull string
    strcpy(la->panfull, "stereo"); // Default
    
    for (int i = 0; i < la->audchnum * la->crayzz; i++) {
        int pan_index = gt_rnd(0, 4 * la->maxnum - 1);
        char pan_entry[256];
        snprintf(pan_entry, sizeof(pan_entry), "|c%d=%s", i, la->pan[pan_index]);
        strcat(la->panfull, pan_entry);
    }
    
    add_log(la, "PAN SETUP DONE", "success");
}

// Parse pan mapping
PanChannel* parse_pan_mapping(LayerAudio *la, int output_channels, int pool_size) {
    PanChannel *channels = malloc(output_channels * sizeof(PanChannel));
    
    for (int i = 0; i < output_channels; i++) {
        channels[i].count = 1;
        channels[i].entries = malloc(sizeof(PanEntry));
        channels[i].entries[0].index = i % pool_size;
        channels[i].entries[0].gain = 1.0f;
    }
    
    // Simple parsing of panfull string
    char *token = strtok(la->panfull, "|");
    while (token != NULL) {
        char *eq = strchr(token, '=');
        if (eq) {
            *eq = '\0';
            char *channel_str = token;
            char *pan_str = eq + 1;
            
            if (strncmp(channel_str, "c", 1) == 0) {
                int channel = atoi(channel_str + 1);
                if (channel >= 0 && channel < output_channels) {
                    // Parse pan entries
                    char *pan_token = strtok(pan_str, "+-");
                    
                    while (pan_token) {
                        if (strncmp(pan_token, "c", 1) == 0) {
                            int index = atoi(pan_token + 1);
                            if (index >= 0 && index < pool_size) {
                                channels[channel].count++;
                                channels[channel].entries = realloc(channels[channel].entries, 
                                                                   channels[channel].count * sizeof(PanEntry));
                                channels[channel].entries[channels[channel].count - 1].index = index;
                                channels[channel].entries[channels[channel].count - 1].gain = 1.0f;
                            }
                        }
                        pan_token = strtok(NULL, "+-");
                    }
                }
            }
        }
        token = strtok(NULL, "|");
    }
    
    return channels;
}

// Apply pan mapping
AudioBuffer* apply_pan_mapping(LayerAudio *la, float **channel_pool, int pool_size, 
                               PanChannel *pan_channels, int output_channels, 
                               size_t max_length, int sample_rate) {
    (void)la; // Unused parameter
    
    // Create output buffer
    AudioBuffer *output = malloc(sizeof(AudioBuffer));
    output->length = max_length;
    output->channels = output_channels;
    output->sample_rate = sample_rate;
    output->data = calloc(max_length * output_channels, sizeof(float));
    
    // Apply pan mapping
    for (int ch = 0; ch < output_channels; ch++) {
        float *output_channel = output->data + ch * max_length;
        
        for (int e = 0; e < pan_channels[ch].count; e++) {
            int src_index = pan_channels[ch].entries[e].index;
            float gain = pan_channels[ch].entries[e].gain;
            
            if (src_index < pool_size && channel_pool[src_index]) {
                float *src_channel = channel_pool[src_index];
                
                for (size_t i = 0; i < max_length; i++) {
                    output_channel[i] += src_channel[i] * gain;
                }
            }
        }
    }
    
    return output;
}

// Apply tone shaping (simplified biquad filter)
void apply_tone_shaping(AudioBuffer *buffer, float bass_gain, float treble_gain) {
    // Simple implementation - in practice would use proper biquad filters
    for (int ch = 0; ch < buffer->channels; ch++) {
        float *channel_data = buffer->data + ch * buffer->length;
        
        for (size_t i = 0; i < buffer->length; i++) {
            // Apply bass boost/cut (low shelf approximation)
            if (bass_gain > 0) {
                channel_data[i] *= (1.0f + bass_gain * 0.1f);
            } else if (bass_gain < 0) {
                channel_data[i] *= (1.0f + bass_gain * 0.05f);
            }
            
            // Apply treble boost/cut (high shelf approximation)
            if (treble_gain > 0) {
                // Simple high-pass effect
                if (i > 0) {
                    float diff = channel_data[i] - channel_data[i-1];
                    channel_data[i] += diff * treble_gain * 0.1f;
                }
            }
            
            // Clamp to [-1, 1]
            if (channel_data[i] > 1.0f) channel_data[i] = 1.0f;
            if (channel_data[i] < -1.0f) channel_data[i] = -1.0f;
        }
    }
}

// Apply gain
void apply_gain(AudioBuffer *buffer, float gain) {
    for (int ch = 0; ch < buffer->channels; ch++) {
        float *channel_data = buffer->data + ch * buffer->length;
        
        for (size_t i = 0; i < buffer->length; i++) {
            channel_data[i] *= gain;
            
            // Clamp to [-1, 1]
            if (channel_data[i] > 1.0f) channel_data[i] = 1.0f;
            if (channel_data[i] < -1.0f) channel_data[i] = -1.0f;
        }
    }
}

// Normalize buffer
void normalize_buffer(AudioBuffer *buffer) {
    float max_amplitude = 0.0f;
    
    for (int ch = 0; ch < buffer->channels; ch++) {
        float *channel_data = buffer->data + ch * buffer->length;
        
        for (size_t i = 0; i < buffer->length; i++) {
            float abs_val = fabsf(channel_data[i]);
            if (abs_val > max_amplitude) {
                max_amplitude = abs_val;
            }
        }
    }
    
    if (max_amplitude > 0.0f && max_amplitude < 1.0f) {
        return; // Already normalized
    }
    
    if (max_amplitude > 0.0f) {
        float gain = 0.95f / max_amplitude; // Leave some headroom
        apply_gain(buffer, gain);
    }
}

// Build channel pool from audio buffers
float** build_channel_pool(LayerAudio *la, size_t *max_length, int *sample_rate) {
    // Find maximum length
    *max_length = 0;
    for (int i = 0; i < la->song_count; i++) {
        if (la->audio_buffers[i]->length > *max_length) {
            *max_length = la->audio_buffers[i]->length;
        }
    }
    
    *sample_rate = SAMPLE_RATE; // Default
    
    // Build channel pool
    int total_channels = 0;
    for (int i = 0; i < la->song_count; i++) {
        total_channels += la->audio_buffers[i]->channels;
    }
    
    float **channel_pool = malloc(total_channels * sizeof(float*));
    int pool_index = 0;
    
    for (int i = 0; i < la->song_count; i++) {
        AudioBuffer *buffer = la->audio_buffers[i];
        
        for (int ch = 0; ch < buffer->channels; ch++) {
            channel_pool[pool_index] = malloc(*max_length * sizeof(float));
            
            // Copy channel data
            for (size_t j = 0; j < buffer->length; j++) {
                channel_pool[pool_index][j] = buffer->data[j * buffer->channels + ch];
            }
            
            // Zero pad if necessary
            for (size_t j = buffer->length; j < *max_length; j++) {
                channel_pool[pool_index][j] = 0.0f;
            }
            
            pool_index++;
        }
    }
    
    return channel_pool;
}

// Process audio mix
AudioBuffer* process_audio(LayerAudio *la) {
    add_log(la, "Processing audio mix...", "info");
    
    // Update parameters with random deltas
    float bass = la->bass + la->bass_dlt * gt_rnd(0, 3);
    float treble = la->treble + la->treble_dlt * gt_rnd(0, 3);
    float bass_freq = la->bass_freq + la->bass_freq_dlt * gt_rnd(0, 3);
    float treble_freq = la->treble_freq + la->treble_freq_dlt * gt_rnd(0, 3);
    float volume = la->volume + la->volume_dlt * gt_rnd(0, 3) / 100.0f;
    float tempo = la->tempo + la->tempo_dlt * gt_rnd(0, 3);
    
    // Log parameters
    char log_msg[512];
    snprintf(log_msg, sizeof(log_msg),
            "Bass: %.2f, Treble: %.2f, Bass Freq: %.2f, Treble Freq: %.2f, Volume: %.2f, Tempo: %.2f",
            bass, treble, bass_freq, treble_freq, volume, tempo);
    add_log(la, log_msg, "info");
    
    // Build channel pool
    size_t max_length;
    int sample_rate;
    float **channel_pool = build_channel_pool(la, &max_length, &sample_rate);
    int pool_size = la->total_channels;
    
    // Parse pan mapping
    int output_channels = la->audchnum > 0 ? la->audchnum : 2;
    PanChannel *pan_channels = parse_pan_mapping(la, output_channels, pool_size);
    
    // Apply pan mapping
    AudioBuffer *mixed = apply_pan_mapping(la, channel_pool, pool_size, 
                                          pan_channels, output_channels,
                                          max_length, sample_rate);
    
    // Apply tone shaping
    apply_tone_shaping(mixed, bass, treble);
    
    // Apply volume
    apply_gain(mixed, volume);
    
    // Normalize
    normalize_buffer(mixed);
    
    // Clean up
    for (int i = 0; i < pool_size; i++) {
        free(channel_pool[i]);
    }
    free(channel_pool);
    
    for (int i = 0; i < output_channels; i++) {
        free(pan_channels[i].entries);
    }
    free(pan_channels);
    
    add_log(la, "Audio processing complete", "success");
    
    return mixed;
}

// Write WAV file
void write_wav_file(const char *filename, AudioBuffer *buffer) {
    FILE *file = fopen(filename, "wb");
    if (!file) {
        return;
    }
    
    // Calculate sizes
    int bytes_per_sample = 2; // 16-bit
    int block_align = buffer->channels * bytes_per_sample;
    int byte_rate = buffer->sample_rate * block_align;
    int data_size = buffer->length * block_align;
    int file_size = 36 + data_size;
    
    // Write WAV header
    fwrite("RIFF", 1, 4, file);
    fwrite(&file_size, 4, 1, file);
    fwrite("WAVE", 1, 4, file);
    fwrite("fmt ", 1, 4, file);
    
    int fmt_size = 16;
    fwrite(&fmt_size, 4, 1, file);
    
    short audio_format = 1; // PCM
    fwrite(&audio_format, 2, 1, file);
    
    short num_channels = buffer->channels;
    fwrite(&num_channels, 2, 1, file);
    
    int sample_rate = buffer->sample_rate;
    fwrite(&sample_rate, 4, 1, file);
    
    fwrite(&byte_rate, 4, 1, file);
    fwrite(&block_align, 2, 1, file);
    
    short bits_per_sample = bytes_per_sample * 8;
    fwrite(&bits_per_sample, 2, 1, file);
    
    fwrite("data", 1, 4, file);
    fwrite(&data_size, 4, 1, file);
    
    // Write audio data
    for (size_t i = 0; i < buffer->length; i++) {
        for (int ch = 0; ch < buffer->channels; ch++) {
            float sample = buffer->data[i * buffer->channels + ch];
            
            // Convert to 16-bit
            int16_t int_sample;
            if (sample >= 1.0f) {
                int_sample = 32767;
            } else if (sample <= -1.0f) {
                int_sample = -32768;
            } else {
                int_sample = (int16_t)(sample * 32767.0f);
            }
            
            fwrite(&int_sample, 2, 1, file);
        }
    }
    
    fclose(file);
}

// Handle generate command
void hdl_generate(LayerAudio *la) {
    if (!la->running) {
        add_log(la, "Not running", "error");
        return;
    }
    
    // Generate timestamp for filename
    time_t now = time(NULL);
    struct tm *t = localtime(&now);
    char timestamp[32];
    snprintf(timestamp, sizeof(timestamp), "%04d%02d%02d_%02d%02d%02d",
            t->tm_year + 1900, t->tm_mon + 1, t->tm_mday,
            t->tm_hour, t->tm_min, t->tm_sec);
    
    // Process audio
    AudioBuffer *mixed = process_audio(la);
    
    if (mixed) {
        // Save to file
        char filename[256];
        snprintf(filename, sizeof(filename), "out_%s.wav", timestamp);
        write_wav_file(filename, mixed);
        
        char log_msg[256];
        snprintf(log_msg, sizeof(log_msg), "Mix generated: %s", filename);
        add_log(la, log_msg, "success");
        
        // Store output
        if (la->output_buffer) {
            free(la->output_buffer->data);
            free(la->output_buffer);
        }
        la->output_buffer = mixed;
        strcpy(la->output_filename, filename);
    }
}

// Handle remember command
void hdl_remember(LayerAudio *la) {
    if (!la->running) {
        add_log(la, "Not running", "error");
        return;
    }
    
    if (la->knowledge_count < 100) {
        la->knowledge_base[la->knowledge_count].channels = la->total_channels;
        strcpy(la->knowledge_base[la->knowledge_count].pan, la->panfull);
        la->knowledge_base[la->knowledge_count].bass = la->bass;
        la->knowledge_base[la->knowledge_count].treble = la->treble;
        la->knowledge_base[la->knowledge_count].bass_freq = la->bass_freq;
        la->knowledge_base[la->knowledge_count].treble_freq = la->treble_freq;
        la->knowledge_base[la->knowledge_count].volume = la->volume;
        la->knowledge_base[la->knowledge_count].tempo = la->tempo;
        la->knowledge_base[la->knowledge_count].maxnum = la->maxnum;
        
        la->knowledge_count++;
        
        add_log(la, "Configuration saved to knowledge base", "success");
    } else {
        add_log(la, "Knowledge base full", "warning");
    }
}

// Handle rerun command
void hdl_rerun(LayerAudio *la) {
    if (!la->running) {
        add_log(la, "Not running", "error");
        return;
    }
    
    // Reset deltas
    la->bass_dlt = 0;
    la->treble_dlt = 0;
    la->bass_freq_dlt = 0;
    la->treble_freq_dlt = 0;
    la->volume_dlt = 0;
    la->tempo_dlt = 0;
    
    // Regenerate pan configuration
    setup_pans(la);
    
    add_log(la, "New mix configuration generated", "info");
}

// Handle stop command
void hdl_stop(LayerAudio *la) {
    la->running = false;
    add_log(la, "Mixing session stopped", "warning");
    add_log(la, "COPYRIGHT FFMPEG & BRENDAN CARELL", "info");
}

// Load AI knowledge base
void load_ai_knowledge_base(LayerAudio *la) {
    // In a real implementation, this would load from a file
    // For now, we'll use the in-memory knowledge base
    
    if (la->knowledge_count == 0) {
        add_log(la, "No knowledge base available", "warning");
        return;
    }
    
    float total_channels = 0;
    float total_bass = 0;
    float total_treble = 0;
    float total_bass_freq = 0;
    float total_treble_freq = 0;
    float total_volume = 0;
    float total_tempo = 0;
    float total_maxnum = 0;
    
    for (int i = 0; i < la->knowledge_count; i++) {
        total_channels += la->knowledge_base[i].channels;
        total_bass += la->knowledge_base[i].bass;
        total_treble += la->knowledge_base[i].treble;
        total_bass_freq += la->knowledge_base[i].bass_freq;
        total_treble_freq += la->knowledge_base[i].treble_freq;
        total_volume += la->knowledge_base[i].volume;
        total_tempo += la->knowledge_base[i].tempo;
        total_maxnum += la->knowledge_base[i].maxnum;
    }
    
    la->ai_channels = total_channels / la->knowledge_count;
    la->ai_bass = total_bass / la->knowledge_count;
    la->ai_treble = total_treble / la->knowledge_count;
    la->ai_bass_freq = total_bass_freq / la->knowledge_count;
    la->ai_treble_freq = total_treble_freq / la->knowledge_count;
    la->ai_volume = total_volume / la->knowledge_count;
    la->ai_tempo = total_tempo / la->knowledge_count;
    la->ai_maxnum = total_maxnum / la->knowledge_count;
    
    // Apply AI parameters with some randomness
    la->maxnum = (int)(gt_rnd(-128, 128) - gt_rnd(-128, 128) + la->ai_maxnum);
    la->bass = (gt_rnd(-18, 18) - gt_rnd(-18, 18) + 100 * la->ai_bass) / la->maxnum;
    la->treble = (gt_rnd(-12, 12) - gt_rnd(-12, 12) + 100 * la->ai_treble) / la->maxnum;
    la->bass_freq = (gt_rnd(-18, 18) - gt_rnd(-18, 18) + 100 * la->ai_bass_freq) / la->maxnum;
    la->treble_freq = (gt_rnd(-12, 12) - gt_rnd(-12, 12) + 100 * la->ai_treble_freq) / la->maxnum;
    la->volume = gt_rnd(-2, 2) - gt_rnd(-5, 5) + la->ai_volume;
    la->tempo = gt_rnd(-6, 6) - gt_rnd(-3, 3) + la->ai_tempo;
    
    add_log(la, "AI Knowledge Base loaded successfully", "success");
    
    char log_msg[512];
    snprintf(log_msg, sizeof(log_msg),
            "Average Bass: %.4f, Treble: %.4f, Bass Freq: %.4f, Treble Freq: %.4f, Volume: %.4f, Tempo: %.4f",
            la->bass, la->treble, la->bass_freq, la->treble_freq, la->volume, la->tempo);
    add_log(la, log_msg, "info");
}

// Cleanup function
void layer_audio_cleanup(LayerAudio *la) {
    // Free audio buffers
    for (int i = 0; i < la->song_count; i++) {
        if (la->audio_buffers[i]) {
            free(la->audio_buffers[i]->data);
            free(la->audio_buffers[i]);
        }
    }
    
    // Free output buffer
    if (la->output_buffer) {
        free(la->output_buffer->data);
        free(la->output_buffer);
    }
    
    // Close log file
    if (la->log_file) {
        fclose(la->log_file);
    }
}

// Main function for testing
int main(int argc, char *argv[]) {
    LayerAudio la;
    layer_audio_init(&la);
    
    printf("LayerAudio C Implementation\n");
    printf("===========================\n\n");
    
    if (argc < 2) {
        printf("Usage: %s <audio_directory>\n", argv[0]);
        printf("Example: %s ./audio_files\n", argv[0]);
        return 1;
    }
    
    // Count songs in directory
    count_songs(&la, argv[1]);
    
    if (la.song_count == 0) {
        printf("No audio files found in directory: %s\n", argv[1]);
        return 1;
    }
    
    // Start session
    la.running = true;
    la.crayzz = 3; // Medium craziness
    la.audchnum = 2; // Stereo output
    
    // Setup pans
    setup_pans(&la);
    
    // Generate a mix
    printf("\nGenerating audio mix...\n");
    hdl_generate(&la);
    
    // Remember configuration
    printf("\nSaving configuration to knowledge base...\n");
    hdl_remember(&la);
    
    // Load AI knowledge base
    printf("\nLoading AI knowledge base...\n");
    load_ai_knowledge_base(&la);
    
    // Generate another mix with AI
    printf("\nGenerating audio mix with AI...\n");
    hdl_generate(&la);
    
    // Stop session
    hdl_stop(&la);
    
    // Cleanup
    layer_audio_cleanup(&la);
    
    printf("\nDone! Check layer_audio.log for details.\n");
    
    return 0;
}
