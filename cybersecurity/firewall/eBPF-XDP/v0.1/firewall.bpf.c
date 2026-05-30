#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <linux/tcp.h>
#include <linux/in.h>
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_endian.h>

// Structure to uniquely identify a bidirectional TCP stream
struct connection_key {
    __be32 src_ip;
    __be32 dst_ip;
    __be16 src_port;
    __be16 dst_port;
};

// Global Connection Tracking Map shared between Ingress (XDP) and Egress (TC) threads
struct {
    __uint(type, BPF_MAP_TYPE_HASH);
    __uint(max_entries, 65536);
    __type(key, struct connection_key);
    __type(value, __u8); // Value '1' implies established
} conntrack_map SEC(".maps");

/* =========================================================================
 * 2. EGRESS FIREWALL (TC Hook) - Controls Outgoing Traffic
 * Default Drop. Allows only outgoing TCP 80 & 443. Tracks states.
 * ========================================================================= */
SEC("tc")
int tc_egress(struct __sk_buff *skb) {
    void *data_end = (void *)(long)skb->data_end;
    void *data     = (void *)(long)skb->data;

    // Boundary checks for parsing
    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end) return BPF_OK;
    if (eth->h_proto != bpf_htons(ETH_P_IP)) return BPF_OK;

    struct iphdr *iph = data + sizeof(struct ethhdr);
    if ((void *)(iph + 1) > data_end) return BPF_OK;

    // Enforce Default Drop for all outgoing TCP packets except allowed rules
    if (iph->protocol == IPPROTO_TCP) {
        struct tcphdr *tcph = (void *)iph + sizeof(struct iphdr);
        if ((void *)(tcph + 1) > data_end) return BPF_OK;

        __u16 dest_port = bpf_ntohs(tcph->dest);

        // Check if packet belongs to a connection we already know about
        struct connection_key key = {
            .src_ip = iph->saddr,
            .dst_ip = iph->daddr,
            .src_port = tcph->source,
            .dst_port = tcph->dest
        };
        __u8 *state = bpf_map_lookup_elem(&conntrack_map, &key);

        // Rule 1: Allow ports 80 and 443 outgoing, record connection state on SYN
        if (dest_port == 80 || dest_port == 443) {
            if (tcph->syn && !tcph->ack) {
                __u8 established = 1;
                bpf_map_update_elem(&conntrack_map, &key, &established, BPF_ANY);
            }
            return BPF_OK; // ALLOW OUTGOING
        }

        // Rule 2: If it's a continuing packet belonging to an already active state
        if (state) {
            // If connection is tearing down, cleanup map entry safely
            if (tcph->fin || tcph->rst) {
                bpf_map_delete_elem(&conntrack_map, &key);
            }
            return BPF_OK; // ALLOW OUTGOING
        }

        // Rule 3: Default Outgoing Drop for any other TCP profile
        return BPF_DROP; 
    }

    return BPF_OK; // Allow non-TCP traffic (like UDP DNS queries) to pass out
}

/* =========================================================================
 * 3. INGRESS FIREWALL (XDP Hook) - Controls Ingoing Traffic
 * Default Drop. Allows only RELATED and ESTABLISHED traffic.
 * ========================================================================= */
SEC("xdp")
int xdp_ingress(struct xdp_md *ctx) {
    void *data_end = (void *)(long)ctx->data_end;
    void *data     = (void *)(long)ctx->data;

    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end) return XDP_PASS;
    if (eth->h_proto != bpf_htons(ETH_P_IP)) return XDP_PASS;

    struct iphdr *iph = data + sizeof(struct ethhdr);
    if ((void *)(iph + 1) > data_end) return XDP_PASS;

    if (iph->protocol == IPPROTO_TCP) {
        struct tcphdr *tcph = (void *)iph + sizeof(struct iphdr);
        if ((void *)(tcph + 1) > data_end) return XDP_PASS;

        // Invert key lookup to match the reverse path (Ingress vs Egress orientation)
        struct connection_key reverse_key = {
            .src_ip = iph->daddr,     // Our Local IP (saved as src during egress)
            .dst_ip = iph->saddr,     // Remote IP
            .src_port = tcph->dest,   // Our Local Port
            .dst_port = tcph->source  // Remote Port
        };

        // Check statefulness mapping table
        __u8 *state = bpf_map_lookup_elem(&conntrack_map, &reverse_key);
        if (state) {
            // Clean state if the tracking session is terminating from the remote
            if (tcph->fin || tcph->rst) {
                bpf_map_delete_elem(&conntrack_map, &reverse_key);
            }
            return XDP_PASS; // ALLOW INGOING (Stateful match found)
        }

        // BLOCK ALL OTHER INCOMING TCP TRAFFIC (Default Inbound Drop)
        return XDP_DROP;
    }

    return XDP_PASS; // Pass non-TCP through
}

char _license[] SEC("license") = "GPL";
