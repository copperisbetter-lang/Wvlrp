package com.wvlrp.gameready;

import android.app.Activity;
import android.app.ActivityManager;
import android.content.Intent;
import android.content.Context;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.graphics.Color;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.widget.*;
import android.view.*;
import android.content.res.ColorStateList;
import java.util.Locale;

/** Lightweight Samsung game-prep dashboard. No fake process-killer. */
public final class MainActivity extends Activity {
    private static final int BG=0xFF111C1A, CARD=0xFF20322E, MINT=0xFF72E1B7, WHITE=0xFFEAF7F0, MUTED=0xFFBACDC5;
    private static final String GAME="https://raw.githack.com/copperisbetter-lang/Wvlrp/5ec7b3b690f4efed264e8436a808e1d4e8b6ece7/world-creator/base-camp/stacey-dive.html?spawn=spring";
    private LinearLayout root;
    private TextView ramLabel,ramNote,powerLabel,heatLabel,storageLabel;
    private ProgressBar ramBar;
    private EditText link;
    private int d(float v){ return (int)(v*getResources().getDisplayMetrics().density+.5f); }
    private GradientDrawable bg(int color){
        GradientDrawable gd=new GradientDrawable();
        gd.setColor(color); gd.setCornerRadius(d(16)); gd.setStroke(d(1),0xFF385B50);return gd;
    }
    private TextView label(LinearLayout box,String text,int size,int color,boolean bold){
        TextView view=new TextView(this); view.setText(text);view.setTextSize(size);view.setTextColor(color);
        if(bold)view.setTypeface(Typeface.DEFAULT,Typeface.BOLD);
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.bottomMargin=d(10);
        box.addView(view,p);return view;
    }
    private LinearLayout card(String heading){
        LinearLayout box=new LinearLayout(this);box.setOrientation(1);box.setPadding(d(18),d(18),d(18),d(18));box.setBackground(bg(CARD));
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.bottomMargin=d(13);root.addView(box,p);
        label(box,heading,13,MINT,true);return box;
    }
    private void action(LinearLayout box,String text,boolean primary,Runnable run){
        Button b=new Button(this);b.setAllCaps(false);b.setText(text);b.setTypeface(Typeface.DEFAULT,Typeface.BOLD);b.setTextSize(13);
        b.setTextColor(primary?BG:WHITE);b.setBackground(bg(primary?MINT:0xFF305148));
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,d(50));p.topMargin=d(7);
        box.addView(b,p);b.setOnClickListener(v->run.run());
    }
    @Override public void onCreate(Bundle saved){
        super.onCreate(saved);
        getWindow().setStatusBarColor(BG);getWindow().setNavigationBarColor(BG);
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.setBackgroundColor(BG);
        root=new LinearLayout(this);root.setPadding(d(18),d(18),d(18),d(32));root.setOrientation(1);scroll.addView(root);
        if(Build.VERSION.SDK_INT>=30)scroll.setOnApplyWindowInsetsListener((v,i)->{
            android.graphics.Insets bars=i.getInsets(WindowInsets.Type.systemBars());v.setPadding(0,bars.top,0,bars.bottom);return i;});
        else scroll.setFitsSystemWindows(true);
        setContentView(scroll);
        label(root,"GATOR  //  GAME READY",25,WHITE,true);
        label(root,"Samsung game-prep assistant  🐊",13,MUTED,false);
        LinearLayout ram=card("AVAILABLE RAM");
        ramLabel=label(ram,"Measuring…",34,WHITE,true);
        ramBar=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);
        ramBar.setMax(1000);ramBar.setProgressTintList(ColorStateList.valueOf(MINT));ramBar.setProgressBackgroundTintList(ColorStateList.valueOf(0xFF36574E));
        LinearLayout.LayoutParams barParams=new LinearLayout.LayoutParams(-1,d(9));barParams.bottomMargin=d(12);ram.addView(ramBar,barParams);
        ramNote=label(ram,"",13,MUTED,false);
        action(ram,"REFRESH RAM",false,this::refresh);
        LinearLayout phone=card("PHONE STATUS");
        label(phone,Build.MANUFACTURER+" "+Build.MODEL+" • Android "+Build.VERSION.RELEASE,14,WHITE,true);
        powerLabel=label(phone,"",14,MUTED,false);heatLabel=label(phone,"",14,MUTED,false);storageLabel=label(phone,"",14,MUTED,false);
        LinearLayout prep=card("BEFORE YOU PLAY");
        label(prep,"Samsung Device Care → Memory → Clean now is the actual supported memory cleaner.",13,MUTED,false);
        action(prep,"OPEN DEVICE CARE",true,this::deviceCare);
        label(prep,"Review any streaming, navigation or recording apps you don't need. Do not stop Android system apps.",13,MUTED,false);
        action(prep,"REVIEW APPS",false,()->settings(Settings.ACTION_APPLICATION_SETTINGS));
        label(prep,"If power saving is active, it may reduce game FPS. Decide whether to turn it off while playing.",13,MUTED,false);
        action(prep,"POWER SAVING SETTINGS",false,()->settings(Settings.ACTION_BATTERY_SAVER_SETTINGS));
        LinearLayout game=card("PLAY STACEY LAKE");
        label(game,"Game test link (editable and saved on this phone):",13,MUTED,false);
        link=new EditText(this);link.setTextColor(WHITE);link.setTextSize(12);link.setMinLines(2);link.setMaxLines(4);
        link.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_VARIATION_URI);
        link.setText(getPreferences(0).getString("game",GAME));link.setPadding(d(10),d(8),d(10),d(8));
        link.setBackground(bg(0xFF152522));game.addView(link,new LinearLayout.LayoutParams(-1,-2));
        action(game,"▶ PLAY STACEY LAKE",true,this::play);
        action(game,"WVLRP HOME",false,()->browse("https://wvlrp.com/"));
        label(root,"NO ADS • NO SPECIAL PERMISSIONS • NO MAGIC RAM CLEANER",11,MUTED,false);
        label(root,"Android uses spare RAM to cache apps. Available RAM is an estimate. Reducing game models and effects often helps FPS more than clearing caches.",12,MUTED,false);
        refresh();
    }
    @Override protected void onResume(){super.onResume();if(ramLabel!=null)refresh();}
    private void refresh(){
        ActivityManager mgr=(ActivityManager)getSystemService(ACTIVITY_SERVICE);
        ActivityManager.MemoryInfo mem=new ActivityManager.MemoryInfo();mgr.getMemoryInfo(mem);
        double avail=mem.availMem/1073741824.0,total=mem.totalMem/1073741824.0;
        int pct=total>0?(int)Math.round(avail/total*1000):0;ramBar.setProgress(Math.max(0,Math.min(1000,pct)));
        ramLabel.setText(String.format(Locale.US,"%.2f GB available",avail));
        ramNote.setText(String.format(Locale.US,"Of %.2f GB RAM • %.0f%% available. %s",total,pct/10.,mem.lowMemory?"Android reports memory pressure.":"No memory pressure detected."));
        PowerManager p=(PowerManager)getSystemService(POWER_SERVICE);
        powerLabel.setText(p!=null&&p.isPowerSaveMode()?"⚠ Power saving: ON":"✓ Power saving: OFF");
        String thermal="Not reported";if(Build.VERSION.SDK_INT>=29&&p!=null){
            int t=p.getCurrentThermalStatus();thermal=t<=1?"Normal":t==2?"Warm":t==3?"Elevated":"Hot — let phone cool";
        }
        heatLabel.setText("Thermal status: "+thermal);
        StatFs stat=new StatFs(Environment.getDataDirectory().getAbsolutePath());
        storageLabel.setText(String.format(Locale.US,"Internal storage: %.1f GB free",stat.getAvailableBytes()/1073741824.0));
    }
    private void settings(String action){try{startActivity(new Intent(action));}catch(Exception e){startActivity(new Intent(Settings.ACTION_SETTINGS));}}
    private void deviceCare(){
        for(String pkg:new String[]{"com.samsung.android.lool","com.samsung.android.sm"}){
            try{Intent i=getPackageManager().getLaunchIntentForPackage(pkg);if(i!=null){
                startActivity(i);Toast.makeText(this,"Device Care → Memory → Clean now",Toast.LENGTH_LONG).show();return;
            }}catch(Exception ignored){}
        }
        Toast.makeText(this,"Search Settings for: Device care → Memory",Toast.LENGTH_LONG).show();settings(Settings.ACTION_SETTINGS);
    }
    private void play(){
        String url=link.getText().toString().trim();if(!url.startsWith("https://")){
            Toast.makeText(this,"Enter a valid https:// URL",Toast.LENGTH_LONG).show();return;
        }
        getPreferences(0).edit().putString("game",url).apply();browse(url);
    }
    private void browse(String url){try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)));}
      catch(Exception e){Toast.makeText(this,"A browser isn't available",Toast.LENGTH_LONG).show();}}
}
