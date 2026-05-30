#include <linux/bpf.h>
#include <linux/if_ether.h>
#include <linux/ip.h>
#include <linux/tcp.h>
#include <linux/udp.h>
#include <linux/in.h>
#include <linux/pkt_cls.h>

#include <bpf/bpf_helpers.h>
#include <bpf/bpf_endian.h>

#define ARPOP_REPLY 2

struct arphdr {
    __be16      ar_hrd;     
    __be16      ar_pro;     
    unsigned char   ar_hln; 
    unsigned char   ar_pln; 
    __be16      ar_op;      
};

SEC("xdp")
int xdp_whitelist_filter(struct xdp_md *ctx) {
    void *data_end = (void *)(long)ctx->data_end;
    void *data     = (void *)(long)ctx->data;

    struct ethhdr *eth = data;
    if ((void *)(eth + 1) > data_end) return XDP_PASS;

    // 1. ARP Spoofing Mitigation
    if (eth->h_proto == bpf_htons(ETH_P_ARP)) {
        struct arphdr *arp = data + sizeof(struct ethhdr);
        if ((void *)(arp + 1) > data_end) return XDP_PASS;

        if (arp->ar_op == bpf_htons(ARPOP_REPLY)) {
            bpf_printk("DROP: Spoofed ARP Reply\n");
            return XDP_DROP; 
        }
        return XDP_PASS;
    }

    if (eth->h_proto != bpf_htons(ETH_P_IP)) return XDP_PASS;

    struct iphdr *iph = data + sizeof(struct ethhdr);
    if ((void *)(iph + 1) > data_end) return XDP_PASS;

    __u32 src_ip = bpf_ntohl(iph->saddr);
    __u32 dst_ip = bpf_ntohl(iph->daddr);

    // 2. Process TCP Layer
    if (iph->protocol == IPPROTO_TCP) {
        struct tcphdr *tcph = (void *)iph + sizeof(struct iphdr);
        if ((void *)(tcph + 1) > data_end) return XDP_PASS;

        __u16 src_port = bpf_ntohs(tcph->source);
        __u16 dst_port = bpf_ntohs(tcph->dest);

        if (src_port == 80 || dst_port == 80 || src_port == 443 || dst_port == 443) {
            return XDP_PASS;
        }
        
        bpf_printk("DROP: TCP %pI4:%d -> %pI4:%d\n", &iph->saddr, src_port, &iph->daddr, dst_port);
        return XDP_DROP;
    }

    // 3. Process UDP Layer
    else if (iph->protocol == IPPROTO_UDP) {
        struct udphdr *udph = (void *)iph + sizeof(struct iphdr);
        if ((void *)(udph + 1) > data_end) return XDP_PASS;

        __u16 src_port = bpf_ntohs(udph->source);
        __u16 dst_port = bpf_ntohs(udph->dest);

        if (src_port == 53 || dst_port == 53) {
            return XDP_PASS;
        }
        
        bpf_printk("DROP: UDP %pI4:%d -> %pI4:%d\n", &iph->saddr, src_port, &iph->daddr, dst_port);
        return XDP_DROP;
    }

    // 4. Default Drop Strategy (ICMP, etc.)
    bpf_printk("DROP: Proto %d (%pI4 -> %pI4)\n", iph->protocol, &iph->saddr, &iph->daddr);
    return XDP_DROP;
}

SEC("classifier")
int tc_egress_filter(struct __sk_buff *skb) {
    return TC_ACT_OK; 
}

char _license[] SEC("license") = "GPL";
